"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InfoIcon } from "lucide-react";

import { Badge } from "@crm-fran/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm-fran/ui/components/card";
import { Checkbox } from "@crm-fran/ui/components/checkbox";
import { Empty } from "@crm-fran/ui/components/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@crm-fran/ui/components/field";
import { Input } from "@crm-fran/ui/components/input";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@crm-fran/ui/components/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@crm-fran/ui/components/select";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@crm-fran/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@crm-fran/ui/components/tabs";
import { usePermissionState } from "@crm-fran/ui/permissions";

import { trpc } from "@/utils/trpc";
import { resolveAdminPageAccess } from "@/lib/admin-page-access";
import { commercialUiLabel } from "@/lib/commercial-ui-labels";

type Inputs = {
  leadVolumePerDay: number;
  appointmentRatePercent: number;
  saleRatePercent: number;
  collectionPerSaleEuros: number;
  refundPerSaleEuros: number;
  directCostPerSaleEuros: number;
  adSpendPerDayEuros: number;
  seasonalityEnabled: boolean;
  seasonalityPercent: number;
  availableCallers: number;
  callerCapacityPerDay: number;
  availableClosers: number;
  closerCapacityPerDay: number;
  targetUtilizationPercent: number;
  fixedPerSaleEuros: number;
  collectionsPercent: number;
  callerSharePercent: number;
  goalSales: number;
  goalBonusEuros: number;
  stretchSales: number;
  stretchBonusEuros: number;
};

const initialInputs: Inputs = {
  leadVolumePerDay: 10, appointmentRatePercent: 40, saleRatePercent: 10,
  collectionPerSaleEuros: 2_000, refundPerSaleEuros: 0, directCostPerSaleEuros: 0, adSpendPerDayEuros: 0,
  seasonalityEnabled: false, seasonalityPercent: 100,
  availableCallers: 1, callerCapacityPerDay: 20, availableClosers: 1, closerCapacityPerDay: 8, targetUtilizationPercent: 85,
  fixedPerSaleEuros: 0, collectionsPercent: 0, callerSharePercent: 40,
  goalSales: 20, goalBonusEuros: 0, stretchSales: 40, stretchBonusEuros: 0,
};

const money = (cents: number, currency: string) => new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);
const percent = (bps: number | null) => bps === null ? "—" : `${(bps / 100).toFixed(1)}%`;

function Information({ title, children }: { title: string; children: string }) {
  return <Popover><PopoverTrigger aria-label={`Información sobre ${title}`}><InfoIcon /></PopoverTrigger><PopoverContent><PopoverHeader><PopoverTitle>{title}</PopoverTitle><PopoverDescription>{children}</PopoverDescription></PopoverHeader></PopoverContent></Popover>;
}

function NumericField({ id, label, value, onChange, description, min = 0, max }: { id: string; label: string; value: number; onChange: (value: number) => void; description?: string; min?: number; max?: number }) {
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel><Input id={id} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />{description ? <FieldDescription>{description}</FieldDescription> : null}</Field>;
}

function AssumptionCards({ data }: { data: Record<string, { value: number | boolean | null; origin: "observed" | "introduced" | "policy_default" }> }) {
  return <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{Object.entries(data).map(([key, item]) => <Card key={key} size="sm"><CardHeader><CardTitle>{commercialUiLabel(key)}</CardTitle><CardDescription><Badge variant="outline">{commercialUiLabel(item.origin)}</Badge></CardDescription></CardHeader><CardContent>{item.value === null ? "Evidencia insuficiente" : typeof item.value === "boolean" ? item.value ? "Sí" : "No" : item.value}</CardContent></Card>)}</div>;
}

export default function CommercialPlanningPage() {
  const permissionState = usePermissionState();
  const adminAccess = resolveAdminPageAccess(permissionState);
  const isAdmin = adminAccess === "granted";
  const [currency, setCurrency] = useState("");
  const validCurrency = /^[A-Z]{3}$/.test(currency);
  const [inputs, setInputs] = useState(initialInputs);
  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) => setInputs((current) => ({ ...current, [key]: value }));
  const query = useQuery({
    ...trpc.commercialPlanning.overview.queryOptions({
      currency: validCurrency ? currency : undefined,
      horizons: [30, 60, 90],
      scenario: {
        leadVolumePerDay: inputs.leadVolumePerDay,
        appointmentRateBps: Math.round(inputs.appointmentRatePercent * 100),
        saleRateBps: Math.round(inputs.saleRatePercent * 100),
        collectionPerSaleCents: Math.round(inputs.collectionPerSaleEuros * 100),
        refundPerSaleCents: Math.round(inputs.refundPerSaleEuros * 100),
        directCostPerSaleCents: Math.round(inputs.directCostPerSaleEuros * 100),
        adSpendPerDayCents: Math.round(inputs.adSpendPerDayEuros * 100),
        seasonalityEnabled: inputs.seasonalityEnabled,
        seasonalityFactorBps: Math.round(inputs.seasonalityPercent * 100),
        capacity: { availableCallers: inputs.availableCallers, callerCapacityPerDay: inputs.callerCapacityPerDay, availableClosers: inputs.availableClosers, closerCapacityPerDay: inputs.closerCapacityPerDay, targetUtilizationBps: Math.round(inputs.targetUtilizationPercent * 100) },
        commission: { fixedPerSaleCents: Math.round(inputs.fixedPerSaleEuros * 100), collectionsPercentBps: Math.round(inputs.collectionsPercent * 100), callerShareBps: Math.round(inputs.callerSharePercent * 100), goalSales: inputs.goalSales, goalBonusCents: Math.round(inputs.goalBonusEuros * 100), stretchSales: inputs.stretchSales, stretchBonusCents: Math.round(inputs.stretchBonusEuros * 100) },
      },
    }),
    enabled: isAdmin,
  });

  if (adminAccess === "loading") return <main className="flex flex-col gap-3 p-6"><p className="text-sm text-muted-foreground">Comprobando permisos…</p><Skeleton className="h-72 w-full" /></main>;
  if (adminAccess === "error") return <main className="p-6"><Empty heading="No se pudieron comprobar los permisos" description="No se asume que el acceso esté denegado. Revisa la conexión y vuelve a intentarlo." /></main>;
  if (adminAccess === "denied") return <main className="p-6"><Empty heading="Acceso restringido" description="La Planificación comercial solo está disponible para administración global." /></main>;
  return <main className="flex flex-col gap-6 p-4 sm:p-6">
    <header className="flex flex-col gap-2"><div className="flex items-center gap-1"><h1 className="text-2xl font-semibold">Planificación comercial</h1><Information title="Planificación comercial">Instantánea controlada por el servidor del último día cerrado en Europe/Madrid. Compara Base observada con un Escenario editable, sin crear usuarios, asignar leads ni ejecutar pagos.</Information></div><p className="text-sm text-muted-foreground">Proyección 30/60/90, capacidad y contratación, y comisiones e incentivos sobre los mismos supuestos efectivos.</p></header>
    <Card><CardHeader><CardTitle>Simulación condicionada</CardTitle><CardDescription>No es una predicción ni un compromiso. El resultado muestra margen antes de Costes no modelados; la estacionalidad está OFF por defecto.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="grid gap-3 sm:grid-cols-2"><Field><FieldLabel htmlFor="planning-currency">Introduce una moneda ISO</FieldLabel><Input id="planning-currency" aria-label="Introduce una moneda ISO" value={currency} maxLength={3} placeholder="EUR" onChange={(event) => setCurrency(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))} /><FieldDescription>Obligatoria para cualquier cálculo monetario; no se aplica FX.</FieldDescription></Field><Field><FieldLabel>Monedas con histórico</FieldLabel><Select value={query.data?.availableCurrencies.includes(currency) ? currency : ""} onValueChange={(value) => setCurrency(value ?? "")}><SelectTrigger aria-label="Moneda histórica"><SelectValue placeholder="Selecciona una moneda" /></SelectTrigger><SelectContent><SelectGroup>{(query.data?.availableCurrencies ?? []).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></Field></div><label className="flex items-center gap-2 text-sm"><Checkbox checked={inputs.seasonalityEnabled} onCheckedChange={(checked) => update("seasonalityEnabled", checked)} />Aplicar estacionalidad introducida</label></CardContent></Card>
    {query.isPending ? <div className="flex flex-col gap-3"><p className="text-sm text-muted-foreground">Cargando planificación…</p><Skeleton className="h-72 w-full" /><Skeleton className="h-48 w-full" /></div> : query.isError ? <Empty heading="No se pudo cargar" description="No se muestran cálculos parciales. Revisa los supuestos acotados." /> : query.data.coverage.observations === 0 ? <Empty heading="Sin observaciones" description="No hay observaciones controladas por el servidor; puedes introducir un escenario, pero la Base observada seguirá insuficiente." /> : null}
    {query.data ? <>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">{query.data.policyVersion}</Badge><Badge variant="outline">Europe/Madrid</Badge><Badge variant="secondary">Cierre {query.data.snapshot.day}</Badge><Badge variant="outline">{query.data.coverage.observations} leads únicos</Badge></div>
      {!validCurrency ? <Empty heading="Selecciona una moneda" description="Introduce exactamente tres letras ISO. No se mezclan monedas ni se aplica FX implícito." /> : query.data.economicStatus === "not_comparable" ? <Empty heading="Evidencia insuficiente" description="No hay verdad económica comparable para la moneda seleccionada; el escenario introducido sigue separado de la Base observada." /> : null}
      <Card><CardHeader><CardTitle>Escenario editable</CardTitle><CardDescription>Todos estos valores son introducidos. Los valores observados y los valores de política permanecen separados y nunca se sobrescriben.</CardDescription></CardHeader><CardContent><FieldGroup><div className="grid gap-4 md:grid-cols-3"><NumericField id="lead-volume" label="Leads por día" value={inputs.leadVolumePerDay} onChange={(value) => update("leadVolumePerDay", value)} /><NumericField id="appointment-rate" label="Tasa de agendas (%)" max={100} value={inputs.appointmentRatePercent} onChange={(value) => update("appointmentRatePercent", value)} /><NumericField id="sale-rate" label="Tasa de venta (%)" max={100} value={inputs.saleRatePercent} onChange={(value) => update("saleRatePercent", value)} /><NumericField id="collection" label={`Cobro por venta (${currency || "ISO"})`} value={inputs.collectionPerSaleEuros} onChange={(value) => update("collectionPerSaleEuros", value)} /><NumericField id="refund" label={`Reembolso por venta (${currency || "ISO"})`} value={inputs.refundPerSaleEuros} onChange={(value) => update("refundPerSaleEuros", value)} /><NumericField id="direct-cost" label={`Coste directo por venta (${currency || "ISO"})`} value={inputs.directCostPerSaleEuros} onChange={(value) => update("directCostPerSaleEuros", value)} /><NumericField id="ad-spend" label={`Gasto publicitario diario (${currency || "ISO"})`} value={inputs.adSpendPerDayEuros} onChange={(value) => update("adSpendPerDayEuros", value)} /><NumericField id="seasonality" label="Factor estacional (%)" min={10} max={300} value={inputs.seasonalityPercent} onChange={(value) => update("seasonalityPercent", value)} /></div></FieldGroup></CardContent></Card>
      {validCurrency ? <Tabs defaultValue="forecast"><TabsList className="flex h-auto flex-wrap"><TabsTrigger value="forecast">Proyección 30/60/90</TabsTrigger><TabsTrigger value="capacity">Capacidad y contratación</TabsTrigger><TabsTrigger value="commission">Comisiones e incentivos</TabsTrigger><TabsTrigger value="assumptions">Base observada</TabsTrigger></TabsList>
        <TabsContent value="forecast"><div className="flex flex-col gap-4"><div className="flex items-center gap-1"><h2 className="text-xl font-semibold">Proyección 30/60/90</h2><Information title="Proyección 30/60/90">La misma fórmula cierra en los tres horizontes: cobros − reembolsos − costes directos − comisiones − gasto. Los deltas comparan contra la Base observada cuando existe.</Information></div>{query.data.scenario.status !== "available" ? <Empty heading="Evidencia insuficiente" description="Faltan supuestos efectivos para cerrar la simulación." /> : <Card><CardHeader><CardTitle>Escenario</CardTitle><CardDescription>{query.data.notice}</CardDescription></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Días</TableHead><TableHead>Leads</TableHead><TableHead>Agendas</TableHead><TableHead>Ventas</TableHead><TableHead>Cobros</TableHead><TableHead>Comisiones</TableHead><TableHead>Gasto</TableHead><TableHead>Margen</TableHead><TableHead>Δ margen</TableHead></TableRow></TableHeader><TableBody>{query.data.scenario.forecast.map((row) => <TableRow key={row.days}><TableCell>{row.days}</TableCell><TableCell>{row.leads}</TableCell><TableCell>{row.appointments}</TableCell><TableCell>{row.sales}</TableCell><TableCell>{money(row.collectionsCents, currency)}</TableCell><TableCell>{money(row.commissionsCents, currency)}</TableCell><TableCell>{money(row.adSpendCents, currency)}</TableCell><TableCell>{money(row.marginBeforeUnmodeledCostsCents, currency)}</TableCell><TableCell>{row.delta.marginBeforeUnmodeledCostsCents === null ? "Base insuficiente" : money(row.delta.marginBeforeUnmodeledCostsCents, currency)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}<Card><CardHeader><CardTitle>Sensibilidad 90 días</CardTitle><CardDescription>Los escenarios desfavorable, base y favorable modifican conjuntamente volumen y tasa de venta ±20%; no es un intervalo de confianza.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3">{query.data.scenario.sensitivity.map((row) => <Badge key={row.key} variant="outline">{commercialUiLabel(row.key)}: {row.sales ?? "—"} ventas · {row.marginBeforeUnmodeledCostsCents === null ? "—" : money(row.marginBeforeUnmodeledCostsCents, currency)}</Badge>)}</CardContent></Card></div></TabsContent>
        <TabsContent value="capacity"><div className="flex flex-col gap-4"><div className="flex items-center gap-1"><h2 className="text-xl font-semibold">Capacidad y contratación</h2><Information title="Capacidad y contratación">Callers se dimensionan por leads y closers por agendas. Las cuentas configuradas no equivalen a personas activas: disponibilidad, capacidad y umbral son supuestos introducidos.</Information></div><Card><CardHeader><CardTitle>Disponibilidad real introducida</CardTitle><CardDescription>No crea usuarios ni asigna leads. La contratación sugerida usa ceil y el umbral visible.</CardDescription></CardHeader><CardContent><FieldGroup><div className="grid gap-4 md:grid-cols-3"><NumericField id="callers" label="Callers disponibles" value={inputs.availableCallers} onChange={(value) => update("availableCallers", value)} /><NumericField id="caller-capacity" label="Leads/caller/día" value={inputs.callerCapacityPerDay} onChange={(value) => update("callerCapacityPerDay", value)} /><NumericField id="closers" label="Closers disponibles" value={inputs.availableClosers} onChange={(value) => update("availableClosers", value)} /><NumericField id="closer-capacity" label="Agendas/closer/día" value={inputs.closerCapacityPerDay} onChange={(value) => update("closerCapacityPerDay", value)} /><NumericField id="utilization" label="Umbral utilización (%)" max={100} value={inputs.targetUtilizationPercent} onChange={(value) => update("targetUtilizationPercent", value)} /></div></FieldGroup></CardContent></Card>{query.data.scenario.capacity.some((row) => row.status !== "available") ? <Empty heading="Capacidad insuficiente" description="Introduce disponibilidad real mayor o igual que cero, capacidad por persona mayor que cero y un umbral de utilización válido." /> : <Card><CardHeader><CardTitle>Utilización, déficit y exceso</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Días</TableHead><TableHead>Rol</TableHead><TableHead>Demanda</TableHead><TableHead>Capacidad efectiva</TableHead><TableHead>Utilización</TableHead><TableHead>Déficit</TableHead><TableHead>Exceso</TableHead><TableHead>Contratación sugerida</TableHead></TableRow></TableHeader><TableBody>{query.data.scenario.capacity.flatMap((row) => row.status !== "available" || !row.callers || !row.closers ? [] : [["Callers", row.callers] as const, ["Closers", row.closers] as const].map(([role, item]) => <TableRow key={`${row.days}-${role}`}><TableCell>{row.days}</TableCell><TableCell>{role}</TableCell><TableCell>{item.demand}</TableCell><TableCell>{item.effectiveCapacity}</TableCell><TableCell>{percent(item.utilizationBps)}</TableCell><TableCell>{item.deficitUnits}</TableCell><TableCell>{item.excessUnits}</TableCell><TableCell>{item.hiresSuggested}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>}</div></TabsContent>
        <TabsContent value="commission"><div className="flex flex-col gap-4"><div className="flex items-center gap-1"><h2 className="text-xl font-semibold">Comisiones e incentivos</h2><Information title="Comisiones e incentivos">Simula fijo por venta, porcentaje de cobros y bonus de objetivo y objetivo ampliado. El reparto caller/closer es un supuesto explícito porque el registro económico histórico no identifica al destinatario.</Information></div><Card><CardHeader><CardTitle>Política introducida</CardTitle><CardDescription>No ejecuta pagos, nóminas ni mutaciones del registro económico. Cada campo conserva su origen introducido, observado o de política.</CardDescription></CardHeader><CardContent><FieldGroup><div className="grid gap-4 md:grid-cols-3"><NumericField id="fixed-sale" label={`Fijo por venta (${currency || "ISO"})`} value={inputs.fixedPerSaleEuros} onChange={(value) => update("fixedPerSaleEuros", value)} /><NumericField id="collections-percent" label="% de cobros" max={100} value={inputs.collectionsPercent} onChange={(value) => update("collectionsPercent", value)} /><NumericField id="caller-share" label="Reparto caller (%)" max={100} value={inputs.callerSharePercent} onChange={(value) => update("callerSharePercent", value)} /><NumericField id="goal-sales" label="Ventas objetivo" value={inputs.goalSales} onChange={(value) => update("goalSales", value)} /><NumericField id="goal-bonus" label={`Bonus objetivo (${currency || "ISO"})`} value={inputs.goalBonusEuros} onChange={(value) => update("goalBonusEuros", value)} /><NumericField id="stretch-sales" label="Ventas objetivo ampliado" value={inputs.stretchSales} onChange={(value) => update("stretchSales", value)} /><NumericField id="stretch-bonus" label={`Bonus objetivo ampliado (${currency || "ISO"})`} value={inputs.stretchBonusEuros} onChange={(value) => update("stretchBonusEuros", value)} /></div></FieldGroup></CardContent></Card>{query.data.scenario.forecast[0] ? <AssumptionCards data={query.data.scenario.forecast[0].commission.assumptions} /> : null}<Card><CardHeader><CardTitle>Agregado por rol</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Días</TableHead><TableHead>Tramo</TableHead><TableHead>Total</TableHead><TableHead>Callers</TableHead><TableHead>Closers</TableHead></TableRow></TableHeader><TableBody>{query.data.scenario.forecast.map((row) => <TableRow key={row.days}><TableCell>{row.days}</TableCell><TableCell>{commercialUiLabel(row.commission.bonusTier)}</TableCell><TableCell>{money(row.commissionsCents, currency)}</TableCell><TableCell>{row.commission.callersCents === null ? "Supuesto requerido" : money(row.commission.callersCents, currency)}</TableCell><TableCell>{row.commission.closersCents === null ? "Supuesto requerido" : money(row.commission.closersCents, currency)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div></TabsContent>
        <TabsContent value="assumptions"><div className="flex flex-col gap-4"><div className="flex items-center gap-1"><h2 className="text-xl font-semibold">Base observada</h2><Information title="Base observada">La base usa volumen cerrado, conversión madura a 30 días y economía madura a 90 días. los valores observados e introducidos se muestran por separado.</Information></div>{query.data.baseline.status !== "available" ? <Empty heading="Evidencia insuficiente" description={`Conversión madura: ${query.data.baseline.coverage.conversionMature}/${query.data.baseline.coverage.minimumConversionSample}. No se inventan tasas ni economía.`} /> : null}<AssumptionCards data={query.data.baseline.assumptions} /><h3 className="font-semibold">Supuestos efectivos del Escenario</h3><AssumptionCards data={query.data.scenario.assumptions} /></div></TabsContent>
      </Tabs> : null}
    </> : null}
  </main>;
}
