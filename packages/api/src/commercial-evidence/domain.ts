import { buildFinancialTruthProjection, type FinancialTruthEvent } from "../profitability/financial-truth";
import type { ConfirmedFacts } from "./facts";
import { createHmac } from "node:crypto";

export const COMMERCIAL_EVIDENCE_POLICY_VERSION = "commercial-evidence-v1";
export type Acquisition = { source: string | null; campaign: string | null; ad: string | null; creative: string | null; acquisitionAngle: string | null };
export type EvidenceCase = { leadId: string; type?: string; assignmentAt: Date; facts: ConfirmedFacts; acquisition: Acquisition; sold: boolean; soldAt?: Date | null; saleTimestamps?: readonly Date[]; financialEvents: readonly FinancialTruthEvent[] };
const DAY = 86_400_000;
const value = (fact: ConfirmedFacts["primaryProfile"]) => fact.kind === "value" ? fact.value : fact.kind === "legacy" ? `legacy:${fact.key}:${fact.value}` : "missing";

export function assertValidAsOf(asOf: Date, now = new Date()) { if (asOf > now) throw new Error("asOf cannot be in the future"); }
export function isConversionMature(item: EvidenceCase, asOf: Date) { return asOf.getTime() - item.assignmentAt.getTime() >= 30 * DAY; }
export function isMonetaryMature(item: EvidenceCase, asOf: Date) { return asOf.getTime() - item.assignmentAt.getTime() >= 90 * DAY; }
export function realizedMargin(item: EvidenceCase, currency: string) {
  return buildFinancialTruthProjection(item.financialEvents).find((row) => row.currency === currency)?.realizedMarginBeforeAdsCents ?? null;
}
const median = (values: number[]) => { const sorted = [...values].sort((a,b)=>a-b); const middle=Math.floor(sorted.length/2); return sorted.length % 2 ? sorted[middle]! : Math.round(((sorted[middle-1] ?? 0)+(sorted[middle] ?? 0))/2); };
function wilson(successes: number, total: number) { if (!total) return [0, 1] as const; const z=1.96,p=successes/total,d=1+z*z/total,c=(p+z*z/(2*total))/d,m=z*Math.sqrt((p*(1-p)+z*z/(4*total))/total)/d; return [Math.max(0,c-m),Math.min(1,c+m)] as const; }

export function buildEconomicScore(input: { target: EvidenceCase; cohort: readonly EvidenceCase[]; asOf: Date; currency: string }) {
  assertValidAsOf(input.asOf);
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error("A selected ISO currency is required");
  const matured = input.cohort.filter((item) => item.leadId !== input.target.leadId && isConversionMature(item,input.asOf));
  const p=value(input.target.facts.primaryProfile), sp=value(input.target.facts.subProfile), s=input.target.acquisition.source ?? "missing", c=input.target.acquisition.campaign ?? "missing";
  const levels = [
    { label:"profile+subprofile+source+campaign", match:(x:EvidenceCase)=>value(x.facts.primaryProfile)===p&&value(x.facts.subProfile)===sp&&(x.acquisition.source??"missing")===s&&(x.acquisition.campaign??"missing")===c },
    { label:"profile+source+campaign", match:(x:EvidenceCase)=>value(x.facts.primaryProfile)===p&&(x.acquisition.source??"missing")===s&&(x.acquisition.campaign??"missing")===c },
    { label:"profile+source", match:(x:EvidenceCase)=>value(x.facts.primaryProfile)===p&&(x.acquisition.source??"missing")===s },
    { label:"source", match:(x:EvidenceCase)=>(x.acquisition.source??"missing")===s },
    { label:"global", match:(_:EvidenceCase)=>true },
  ];
  const chosen = levels.map((level)=>({ ...level, rows:matured.filter(level.match) })).find((level)=>level.rows.length>=10) ?? { ...levels.at(-1)!, rows:matured };
  const globalSales=matured.filter((x)=>x.sold).length, prior=matured.length?globalSales/matured.length:0.5;
  const sales=chosen.rows.filter((x)=>x.sold).length, denominator=chosen.rows.length, effectiveSample=denominator+30;
  const probability=(sales+prior*30)/effectiveSample, interval=wilson(sales,denominator);
  const margins=chosen.rows.filter((x)=>x.sold&&isMonetaryMature(x,input.asOf)).map((x)=>realizedMargin(x,input.currency)).filter((x):x is number=>x!==null);
  const marginMedian=margins.length?median(margins):null;
  const expectedMarginCents=marginMedian===null?null:Math.round(probability*marginMedian);
  const display=(x:number)=>Math.max(0,Math.min(100,Math.round(x*100)));
  const confidence=denominator>=30&&margins.length>=10&&interval[1]-interval[0]<=0.3&&chosen.label!=="global"?"high":denominator>=10?"medium":"low";
  return { currency:input.currency, probabilityBps:Math.round(probability*10_000), numerator:sales, denominator, priorBps:Math.round(prior*10_000), effectiveSample, fallback:chosen.label, wilsonBps:{low:Math.round(interval[0]*10_000),high:Math.round(interval[1]*10_000)}, realizedMarginBeforeAdsMedianCents:marginMedian, expectedMarginCents, display:{p10:display(interval[0]),p90:display(interval[1])}, confidence, monetarySample:margins.length, policyVersion:COMMERCIAL_EVIDENCE_POLICY_VERSION, observational:true };
}

export function findTwins(input:{target:EvidenceCase;cohort:readonly EvidenceCase[];asOf:Date;currency:string;k?:number;admin?:boolean}) {
  const features=(x:EvidenceCase)=>[value(x.facts.primaryProfile),value(x.facts.subProfile),x.acquisition.source??"missing",x.acquisition.campaign??"missing",...x.facts.motivations.map((v)=>`m:${v}`),...x.facts.objections.map((v)=>`o:${v}`)];
  const target=new Set(features(input.target));
  return input.cohort.filter((x)=>x.leadId!==input.target.leadId&&isConversionMature(x,input.asOf)).map((item)=>{const candidate=new Set(features(item));const matched=[...target].filter((x)=>candidate.has(x));const missing=[...target].filter((x)=>!candidate.has(x));return { item,matched,missing,weight:matched.length/(matched.length+missing.length||1)};}).sort((a,b)=>b.weight-a.weight||a.item.leadId.localeCompare(b.item.leadId)).slice(0,input.k??5).map(({item,matched,missing,weight})=>({ ...(input.admin?{leadId:item.leadId}:{}), caseRef:`case-${createHmac("sha256","crm-fran:commercial-evidence:v1").update(item.leadId).digest("hex").slice(0,20)}`,weight,matchedFactors:matched,missingFactors:missing,sold:item.sold,realizedMarginBeforeAdsCents:isMonetaryMature(item,input.asOf)?realizedMargin(item,input.currency):null }));
}

const MICRO_DIMENSIONS = ["type","profile","subprofile","source","campaign","acquisitionAngle","motivation","objection"] as const;
const dimensionValue=(item:EvidenceCase,key:typeof MICRO_DIMENSIONS[number])=>key==="type"?item.type??"missing":key==="profile"?value(item.facts.primaryProfile):key==="subprofile"?value(item.facts.subProfile):key==="motivation"?item.facts.motivations.join("+")||"missing":key==="objection"?item.facts.objections.join("+")||"missing":item.acquisition[key]??"missing";
export function buildMicrosegments(input:{cohort:readonly EvidenceCase[];asOf:Date;currency:string}) {
  const matured=input.cohort.filter(x=>isConversionMature(x,input.asOf));
  const globalRate=matured.length?matured.filter(x=>x.sold).length/matured.length:0;
  const combinations: (readonly typeof MICRO_DIMENSIONS[number][])[]=[];
  for(let i=0;i<MICRO_DIMENSIONS.length;i++){combinations.push([MICRO_DIMENSIONS[i]!]);for(let j=i+1;j<MICRO_DIMENSIONS.length;j++){combinations.push([MICRO_DIMENSIONS[i]!,MICRO_DIMENSIONS[j]!]);for(let k=j+1;k<MICRO_DIMENSIONS.length;k++)combinations.push([MICRO_DIMENSIONS[i]!,MICRO_DIMENSIONS[j]!,MICRO_DIMENSIONS[k]!]);}}
  const rows=[];
  for(const dims of combinations){const groups=new Map<string,EvidenceCase[]>();for(const item of matured){const key=JSON.stringify(dims.map(d=>[d,dimensionValue(item,d)]));groups.set(key,[...(groups.get(key)??[]),item]);}for(const [segment,items] of groups){if(items.length<30)continue;const parent=dims.length===1?matured:matured.filter(x=>dims.slice(0,-1).every(d=>dimensionValue(x,d)===dimensionValue(items[0]!,d)));if(parent.length-items.length<10)continue;const sales=items.filter(x=>x.sold).length,parentRate=parent.length?parent.filter(x=>x.sold).length/parent.length:globalRate,shrunk=(sales+parentRate*30)/(items.length+30);const margins=items.filter(x=>x.sold&&isMonetaryMature(x,input.asOf)).map(x=>realizedMargin(x,input.currency)).filter((x):x is number=>x!==null);rows.push({dimensions:dims,segment:JSON.parse(segment) as [string,string][],sample:items.length,conversionBps:Math.round(shrunk*10000),liftBps:Math.round((shrunk-parentRate)*10000),expectedMarginCents:margins.length?Math.round(shrunk*median(margins)):null,label:"observational" as const,intervalBps:wilson(sales,items.length).map(x=>Math.round(x*10000))});}}
  return rows;
}

export type EvidenceSnapshot={policyVersion:string;asOf:string;target:"sale";probabilityBps:number|null;expectedMarginCents:number|null;currency:string|null;fallback:string;sample:number;confidence:string;features:Record<string,string>;status?:"economic_truth_missing"};
export function parseEvidenceSnapshot(value:unknown):EvidenceSnapshot|null{if(typeof value!=="object"||value===null)return null;const x=value as Record<string,unknown>;const probabilityValid=x.probabilityBps===null||(typeof x.probabilityBps==="number"&&Number.isInteger(x.probabilityBps)&&x.probabilityBps>=0&&x.probabilityBps<=10000);const currencyValid=x.currency===null||(typeof x.currency==="string"&&/^[A-Z]{3}$/.test(x.currency));return typeof x.policyVersion==="string"&&typeof x.asOf==="string"&&x.target==="sale"&&probabilityValid&&currencyValid&&typeof x.fallback==="string"&&typeof x.sample==="number"&&typeof x.confidence==="string"&&typeof x.features==="object"?x as EvidenceSnapshot:null;}
export function calibrateEvidenceSnapshots(input:{rows:readonly {snapshot:EvidenceSnapshot;shownAt:Date;soldAt:Date|null}[];asOf:Date}){const matured=input.rows.filter(x=>input.asOf.getTime()-x.shownAt.getTime()>=30*DAY&&x.snapshot.probabilityBps!==null);const scored=matured.map(x=>({p:x.snapshot.probabilityBps!/10000,y:Number(Boolean(x.soldAt&&x.soldAt>=x.shownAt&&x.soldAt.getTime()-x.shownAt.getTime()<=30*DAY))}));const brier=scored.length?scored.reduce((s,x)=>s+(x.p-x.y)**2,0)/scored.length:null;const bins=Array.from({length:10},(_,i)=>{const rows=scored.filter(x=>x.p>=i/10&&(i===9?x.p<=1:x.p<(i+1)/10));return {fromBps:i*1000,toBps:(i+1)*1000,sample:rows.length,predictedBps:rows.length?Math.round(rows.reduce((s,x)=>s+x.p,0)/rows.length*10000):null,actualBps:rows.length?Math.round(rows.reduce((s,x)=>s+x.y,0)/rows.length*10000):null};});const ece=scored.length?bins.reduce((s,b)=>s+(b.sample/scored.length)*Math.abs((b.predictedBps??0)-(b.actualBps??0))/10000,0):null;return {sample:scored.length,brier,ece,bins};}
