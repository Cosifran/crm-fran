"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { InfoIcon } from "lucide-react";

import { Badge } from "@crm-fran/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm-fran/ui/components/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@crm-fran/ui/components/chart";
import { Empty } from "@crm-fran/ui/components/empty";
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

const madridDay = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const shiftCalendarDay = (day: string, offset: number) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, date! + offset)).toISOString().slice(0, 10);
};
const initialTo = () => madridDay();
const initialFrom = () => shiftCalendarDay(madridDay(), -90);
const percent = (basisPoints: number | null) => basisPoints === null ? "—" : `${(basisPoints / 100).toFixed(1)}%`;
const money = (cents: number, currency: string) => new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);
const dateLabel = (value: string | Date) => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "medium" }).format(value instanceof Date ? value : new Date(value));
const inclusiveEndLabel = (value: string | Date) => {
  const exclusiveEnd = value instanceof Date ? value : new Date(value);
  return dateLabel(new Date(exclusiveEnd.getTime() - 1));
};

function Information({ title, children }: { title: string; children: string }) {
  return <Popover><PopoverTrigger aria-label={`Información sobre ${title}`}><InfoIcon /></PopoverTrigger><PopoverContent><PopoverHeader><PopoverTitle>{title}</PopoverTitle><PopoverDescription>{children}</PopoverDescription></PopoverHeader></PopoverContent></Popover>;
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div className="flex items-center gap-1"><h2 className="text-xl font-semibold">{title}</h2><Information title={title}>{description}</Information></div>;
}

function HonestState({ state }: { state: "insufficient_evidence" | "currency_required" | "not_comparable" }) {
  if (state === "currency_required") return <Empty heading="Selecciona una moneda" description="Hay varias monedas y no se aplica FX implícito." />;
  if (state === "not_comparable") return <Empty heading="No comparable" description="No existe verdad económica comparable para la moneda seleccionada." />;
  return <Empty heading="Evidencia insuficiente" description="La muestra no alcanza el mínimo visible de esta sección." />;
}

function Seasonality({ data }: { data: NonNullable<ReturnType<typeof useObservatory>["data"]>["seasonality"] }) {
  return <div className="flex flex-col gap-4"><SectionTitle title="Estacionalidad" description="Agrupa únicamente días y semanas cerrados en Europe/Madrid. Muestra mediana e IQR; describe patrones, no predice causas." />{data.status !== "available" ? <HonestState state={data.status} /> : <><Card><CardHeader><CardTitle>Volumen por semana cerrada</CardTitle><CardDescription>{dateLabel(data.range.from)}–{inclusiveEndLabel(data.range.to)} · {data.minimum} · {data.observations} observaciones en {data.sampleDays} días y {data.sampleWeeks} semanas · {data.rule}</CardDescription></CardHeader><CardContent><ChartContainer role="img" aria-label="Volumen de leads por semana cerrada" config={{ volume: { label: "Leads", color: "var(--chart-1)" } }} className="h-64 w-full"><BarChart accessibilityLayer data={data.byWeek}><CartesianGrid vertical={false} /><XAxis dataKey="week" tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="volume" fill="var(--color-volume)" radius={4} /></BarChart></ChartContainer></CardContent></Card><Card><CardHeader><CardTitle>Patrón por día de la semana</CardTitle><CardDescription>Mediana, cuartil 1 y cuartil 3 sobre días cerrados.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Día</TableHead><TableHead>Muestra</TableHead><TableHead>Volumen mediano</TableHead><TableHead>IQR volumen</TableHead><TableHead>Conversión mediana</TableHead></TableRow></TableHeader><TableBody>{data.byWeekday.map((row) => <TableRow key={row.weekday}><TableCell>{row.label}</TableCell><TableCell>{row.volume.sample}</TableCell><TableCell>{row.volume.median ?? "—"}</TableCell><TableCell>{row.volume.q1 ?? "—"}–{row.volume.q3 ?? "—"}</TableCell><TableCell>{row.conversionBps.median === null ? "—" : percent(Math.round(row.conversionBps.median))}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></>}</div>;
}

function Anomalies({ data }: { data: NonNullable<ReturnType<typeof useObservatory>["data"]>["anomalies"] }) {
  return <div className="flex flex-col gap-4"><SectionTitle title="Radar de anomalías" description="Compara el periodo con un periodo de referencia de igual duración estrictamente anterior. Volumen usa mediana y MAD; conversión usa Wilson 95%, muestra mínima y materialidad." />{data.status !== "available" ? <HonestState state={data.status} /> : null}<Card><CardHeader><CardTitle>Señales deterministas</CardTitle><CardDescription>Actual {dateLabel(data.range.from)}–{inclusiveEndLabel(data.range.to)} · referencia {dateLabel(data.baseline.from)}–{inclusiveEndLabel(data.baseline.to)} · {data.rule}</CardDescription></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Ámbito</TableHead><TableHead>Métrica</TableHead><TableHead>Estado</TableHead><TableHead>Actual</TableHead><TableHead>Referencia</TableHead><TableHead>Leads</TableHead><TableHead>Grupos temporales</TableHead><TableHead>Regla</TableHead></TableRow></TableHeader><TableBody>{data.items.map((row) => <TableRow key={row.key}><TableCell>{commercialUiLabel(row.scope)} · {row.label}</TableCell><TableCell>{commercialUiLabel(row.metric)}</TableCell><TableCell><Badge variant={row.state === "anomaly" ? "destructive" : row.state === "within_expected_range" ? "secondary" : "outline"}>{commercialUiLabel(row.state)}</Badge></TableCell><TableCell>{row.value === null ? "—" : row.metric === "conversion" ? `${(row.value * 100).toFixed(1)}%` : row.value.toFixed(2)}</TableCell><TableCell>{row.baseline === null ? "—" : row.metric === "conversion" ? `${(row.baseline * 100).toFixed(1)}%` : row.baseline.toFixed(2)}</TableCell><TableCell>{row.sample} / {row.baselineSample}</TableCell><TableCell>{row.currentBucketCount} / {row.baselineBucketCount}</TableCell><TableCell className="max-w-80 text-xs text-muted-foreground">{row.minimum} · {row.rule}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>;
}

function Bridge({ data, currency }: { data: NonNullable<ReturnType<typeof useObservatory>["data"]>["bridge"]; currency: string }) {
  const economic = data.economic;
  return <div className="flex flex-col gap-4"><SectionTitle title="Puente explicativo" description="Separa aritméticamente el cambio comercial y económico. Cada puente cierra exactamente contra su delta; no atribuye causalidad." /><Card><CardHeader><CardTitle>Lectura responsable</CardTitle><CardDescription>{data.note} Cada barra es una contribución aritmética. No implica causalidad.</CardDescription></CardHeader></Card>{data.commercial.status !== "available" ? <HonestState state={data.commercial.status} /> : <Card><CardHeader><CardTitle>Puente comercial simétrico</CardTitle><CardDescription>{data.commercial.rule}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-sm text-muted-foreground">Delta de ventas</p><p className="text-2xl font-semibold">{data.commercial.deltaSales.toFixed(2)}</p></div><div><p className="text-sm text-muted-foreground">Contribución volumen</p><p>{data.commercial.volumeContribution.toFixed(2)}</p></div><div><p className="text-sm text-muted-foreground">Contribución conversión</p><p>{data.commercial.conversionContribution.toFixed(2)}</p></div><div><p className="text-sm text-muted-foreground">Muestra madura actual / referencia</p><p>{data.commercial.current.sample} / {data.commercial.baseline.sample}</p></div></CardContent></Card>}{economic.status !== "available" ? <HonestState state={economic.status} /> : <Card><CardHeader><CardTitle>Desglose del margen realizado</CardTitle><CardDescription>{economic.rule}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="flex flex-wrap gap-3"><Badge variant="outline">Referencia {money(economic.baseline.marginCents, currency)}</Badge><Badge variant="outline">Actual {money(economic.current.marginCents, currency)}</Badge><Badge variant="secondary">Δ {money(economic.deltaMarginCents, currency)}</Badge></div><Table><TableHeader><TableRow><TableHead>Contribución aritmética</TableHead><TableHead>Importe</TableHead></TableRow></TableHeader><TableBody>{economic.contributions.map((row) => <TableRow key={row.key}><TableCell>{row.label}</TableCell><TableCell>{money(row.amountCents, currency)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}</div>;
}

function Risk({ data, currency }: { data: NonNullable<ReturnType<typeof useObservatory>["data"]>["risk"]; currency: string }) {
  return <div className="flex flex-col gap-4"><SectionTitle title="Mapa de dependencia y riesgo" description="Calcula top1, top3 y HHI por fuente, campaña, caller, closer y perfil. El margen negativo se suma por exposición absoluta, no se compensa con grupos positivos." />{data.status !== "available" ? <HonestState state={data.status} /> : <><div className="grid gap-3 md:grid-cols-3"><Card><CardHeader><CardTitle>Cobertura</CardTitle></CardHeader><CardContent><p>n={data.coverage.sample}</p><p className="text-sm text-muted-foreground">Sin atribución: {data.coverage.withoutAttribution}</p><p className="text-sm text-muted-foreground">Ventas sin registro económico: {data.coverage.salesWithoutLedger === null ? "No evaluable sin moneda" : data.coverage.salesWithoutLedger}</p></CardContent></Card><Card><CardHeader><CardTitle>Umbrales</CardTitle></CardHeader><CardContent><p className="text-sm">Alto: top1 ≥60% o HHI ≥0,35</p><p className="text-sm">Medio: top1 ≥40% o HHI ≥0,20</p></CardContent></Card><Card><CardHeader><CardTitle>Moneda económica</CardTitle></CardHeader><CardContent><p>{currency || "Selecciona una moneda"}</p><p className="text-sm text-muted-foreground">Sin FX implícito</p></CardContent></Card></div><Card><CardHeader><CardTitle>Concentración por dimensión</CardTitle><CardDescription>{dateLabel(data.range.from)}–{inclusiveEndLabel(data.range.to)} · {data.rule}</CardDescription></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Dimensión</TableHead><TableHead>Riesgo</TableHead><TableHead>Grupo principal</TableHead><TableHead>Top 1</TableHead><TableHead>Top 3</TableHead><TableHead>HHI</TableHead><TableHead>Grupos</TableHead><TableHead>Exposición absoluta</TableHead><TableHead>Margen negativo absoluto</TableHead></TableRow></TableHeader><TableBody>{data.dimensions.map((row) => <TableRow key={row.dimension}><TableCell>{commercialUiLabel(row.dimension)}</TableCell><TableCell><Badge variant={row.level === "high" ? "destructive" : row.level === "medium" ? "secondary" : "outline"}>{commercialUiLabel(row.level)}</Badge></TableCell><TableCell>{row.groups[0]?.key ?? "Sin grupos"}</TableCell><TableCell>{percent(row.top1Bps)}</TableCell><TableCell>{percent(row.top3Bps)}</TableCell><TableCell>{row.hhi.toFixed(3)}</TableCell><TableCell>{row.groups.length} · n={row.sample}</TableCell><TableCell>{currency ? money(row.absoluteExposureCents, currency) : "—"}</TableCell><TableCell>{currency ? money(row.negativeMarginExposureCents, currency) : "—"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></>}</div>;
}

function useObservatory(from: string, to: string, currency: string, enabled: boolean) {
  return useQuery({ ...trpc.commercialObservatory.overview.queryOptions({ from, to, currency: currency || undefined }), enabled });
}

export default function CommercialObservatoryPage() {
  const permissionState = usePermissionState();
  const adminAccess = resolveAdminPageAccess(permissionState);
  const isAdmin = adminAccess === "granted";
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [currency, setCurrency] = useState("");
  const query = useObservatory(from, to, currency, isAdmin);

  if (adminAccess === "loading") return <main className="flex flex-col gap-3 p-6"><p className="text-sm text-muted-foreground">Comprobando permisos…</p><Skeleton className="h-72 w-full" /></main>;
  if (adminAccess === "error") return <main className="p-6"><Empty heading="No se pudieron comprobar los permisos" description="No se asume que el acceso esté denegado. Revisa la conexión y vuelve a intentarlo." /></main>;
  if (adminAccess === "denied") return <main className="p-6"><Empty heading="Acceso restringido" description="El Observatorio comercial solo está disponible para administración." /></main>;
  return <main className="flex flex-col gap-6 p-4 sm:p-6"><header className="flex flex-col gap-2"><div className="flex items-center gap-1"><h1 className="text-2xl font-semibold">Observatorio comercial</h1><Information title="Observatorio comercial">Instantánea controlada por el servidor, determinista y de solo lectura. No muestra leads, no crea alertas y no ejecuta decisiones operativas.</Information></div><p className="text-sm text-muted-foreground">Estacionalidad, anomalías, explicación aritmética de resultados y concentración de riesgo en una sola lectura.</p></header><Card><CardHeader><CardTitle>Periodo y moneda</CardTitle><CardDescription>El final no puede estar en el futuro. Solo se usan grupos temporales cerrados en Europe/Madrid.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row"><Input aria-label="Desde" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /><Input aria-label="Hasta" type="date" value={to} min={from} max={initialTo()} onChange={(event) => setTo(event.target.value)} /><Select value={currency} onValueChange={(value) => setCurrency(value ?? "")}><SelectTrigger><SelectValue placeholder="Selecciona una moneda" /></SelectTrigger><SelectContent><SelectGroup>{(query.data?.currencies ?? []).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></CardContent></Card>{query.isPending ? <div className="flex flex-col gap-3"><p className="text-sm text-muted-foreground">Cargando observatorio…</p><Skeleton className="h-72 w-full" /><Skeleton className="h-48 w-full" /></div> : query.isError ? <Empty heading="No se pudo cargar" description="No se muestran cálculos parciales; revisa el rango y vuelve a intentarlo." /> : query.data.coverage.observations === 0 ? <Empty heading="Sin observaciones" description="No hay observaciones controladas por el servidor dentro del histórico disponible." /> : <><div className="flex flex-wrap gap-2"><Badge variant="outline">{query.data.policyVersion}</Badge><Badge variant="outline">Europe/Madrid</Badge><Badge variant="secondary">{query.data.coverage.observations} leads únicos</Badge>{query.data.coverage.duplicateObservationsExcluded > 0 ? <Badge variant="outline">{query.data.coverage.duplicateObservationsExcluded} duplicados excluidos</Badge> : null}</div><Tabs defaultValue="seasonality"><TabsList className="flex h-auto flex-wrap"><TabsTrigger value="seasonality">Estacionalidad</TabsTrigger><TabsTrigger value="anomalies">Radar de anomalías</TabsTrigger><TabsTrigger value="bridge">Puente explicativo</TabsTrigger><TabsTrigger value="risk">Mapa de riesgo</TabsTrigger></TabsList><TabsContent value="seasonality"><Seasonality data={query.data.seasonality} /></TabsContent><TabsContent value="anomalies"><Anomalies data={query.data.anomalies} /></TabsContent><TabsContent value="bridge"><Bridge data={query.data.bridge} currency={currency} /></TabsContent><TabsContent value="risk"><Risk data={query.data.risk} currency={currency} /></TabsContent></Tabs></>}</main>;
}
