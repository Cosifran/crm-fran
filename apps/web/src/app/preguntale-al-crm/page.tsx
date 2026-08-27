"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InfoIcon, SearchIcon } from "lucide-react";

import { Badge } from "@crm-fran/ui/components/badge";
import { Button } from "@crm-fran/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm-fran/ui/components/card";
import { Empty } from "@crm-fran/ui/components/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@crm-fran/ui/components/field";
import { Input } from "@crm-fran/ui/components/input";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@crm-fran/ui/components/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@crm-fran/ui/components/select";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@crm-fran/ui/components/table";
import { ToggleGroup, ToggleGroupItem } from "@crm-fran/ui/components/toggle-group";
import { usePermissionState } from "@crm-fran/ui/permissions";

import { trpc } from "@/utils/trpc";
import { resolveAdminPageAccess } from "@/lib/admin-page-access";
import { commercialUiLabel } from "@/lib/commercial-ui-labels";

type AskRequest = {
  question: string;
  overrides?: { fromDay?: string; toDay?: string; currency?: string; horizon?: 30 | 60 | 90; metric?: "sales" | "margin" | "reaction" };
};

const periods = [7, 30, 60, 90, 180, 365] as const;
const horizons = [30, 60, 90] as const;

function parsePeriod(value: string) {
  if (value === "7") return 7;
  if (value === "30") return 30;
  if (value === "60") return 60;
  if (value === "90") return 90;
  if (value === "180") return 180;
  if (value === "365") return 365;
  return null;
}

export function naturalLanguagePeriod(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const match = normalized.match(/\bultimos\s+(7|30|60|90|180|365)(?:\s*dias?)?\b|\b(7|30|60|90|180|365)\s*dias?\b/);
  const days = match?.[1] ?? match?.[2];
  if (days) return parsePeriod(days);
  if (/\bsemana\b/.test(normalized)) return 7;
  if (/\bmes\b/.test(normalized)) return 30;
  if (/\b(?:ano|ultimo ano)\b/.test(normalized)) return 365;
  return null;
}

export function resolvedPeriod(question: string, explicitPeriod: (typeof periods)[number] | null) {
  return explicitPeriod ?? naturalLanguagePeriod(question) ?? 30;
}

function parseHorizon(value: string) {
  if (value === "30") return 30;
  if (value === "60") return 60;
  if (value === "90") return 90;
  return null;
}

function dayKeyFromOrdinal(value: number) {
  return new Date(value * 86_400_000).toISOString().slice(0, 10);
}

function selectedPeriod(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const parts = today.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const todayOrdinal = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const toDay = dayKeyFromOrdinal(todayOrdinal - 1);
  return { fromDay: dayKeyFromOrdinal(todayOrdinal - days), toDay };
}

function Information({ title, children }: { title: string; children: string }) {
  return <Popover><PopoverTrigger aria-label={`Información sobre ${title}`}><InfoIcon /></PopoverTrigger><PopoverContent><PopoverHeader><PopoverTitle>{title}</PopoverTitle><PopoverDescription>{children}</PopoverDescription></PopoverHeader></PopoverContent></Popover>;
}

function formatValue(value: number | null, unit: string, currency: string) {
  if (value === null) return "—";
  if (unit === "basis_points") return `${(value / 100).toFixed(1)}%`;
  if (unit === "cents") return currency ? new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(value / 100) : `${value} céntimos (moneda no seleccionada)`;
  if (unit === "ratio") return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value);
  return new Intl.NumberFormat("es-ES").format(value);
}

export default function AskCrmPage() {
  const permissionState = usePermissionState();
  const adminAccess = resolveAdminPageAccess(permissionState);
  const isAdmin = adminAccess === "granted";
  const [question, setQuestion] = useState("");
  const [periodOverride, setPeriodOverride] = useState<(typeof periods)[number] | null>(null);
  const [currency, setCurrency] = useState("");
  const [horizon, setHorizon] = useState<(typeof horizons)[number]>(90);
  const [submitted, setSubmitted] = useState<AskRequest | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const catalog = useQuery({ ...trpc.askCrm.catalog.queryOptions(), enabled: isAdmin });
  const answer = useQuery({ ...trpc.askCrm.ask.queryOptions(submitted ?? { question: "" }), enabled: isAdmin && submitted !== null });
  const period = resolvedPeriod(question, periodOverride);

  if (adminAccess === "loading") return <main className="flex flex-col gap-3 p-6"><p className="text-sm text-muted-foreground">Comprobando permisos…</p><Skeleton className="h-72 w-full" /></main>;
  if (adminAccess === "error") return <main className="p-6"><Empty heading="No se pudieron comprobar los permisos" description="No se asume que el acceso esté denegado. Revisa la conexión y vuelve a intentarlo." /></main>;
  if (adminAccess === "denied") return <main className="p-6"><Empty heading="Acceso restringido" description="Pregúntale al CRM solo está disponible para administración global." /></main>;

  const submit = (next: AskRequest = { question: question.trim(), overrides: { ...selectedPeriod(period), currency: /^[A-Z]{3}$/.test(currency) ? currency : undefined, horizon } }) => {
    if (question.trim().length < 3 && next.question.trim().length < 3) return;
    setSubmitted(next);
    setHistory((current) => [question.trim() || next.question, ...current.filter((item) => item !== (question.trim() || next.question))].slice(0, 5));
  };

  const result = answer.data;
  return <main className="flex flex-col gap-6 p-4 sm:p-6">
    <header className="flex flex-col gap-2"><div className="flex items-center gap-1"><h1 className="text-2xl font-semibold">Pregúntale al CRM</h1><Information title="Pregúntale al CRM">Interpreta español mediante un catálogo cerrado y ejecuta un único modelo de lectura seguro. No usa IA externa, consultas generadas, representaciones vectoriales ni escrituras.</Information></div><p className="text-sm text-muted-foreground">Consultas agregadas, explicables y de solo lectura sobre la evidencia comercial existente.</p></header>

    <Card><CardHeader><CardTitle>Haz una pregunta acotada</CardTitle><CardDescription>Los ejemplos solo rellenan el campo. Revisa y edita la pregunta antes de consultar.</CardDescription></CardHeader><CardContent><FieldGroup><Field><FieldLabel htmlFor="ask-crm-question">Pregunta</FieldLabel><Input id="ask-crm-question" value={question} minLength={3} maxLength={280} placeholder="¿Qué anomalías hubo este mes?" onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} /><FieldDescription>Entre 3 y 280 caracteres. No se aceptan SQL ni filtros arbitrarios.</FieldDescription></Field><div className="grid gap-4 md:grid-cols-3"><Field><FieldLabel>Periodo</FieldLabel><ToggleGroup value={[String(period)]} onValueChange={(values) => { const next = parsePeriod(values[0] ?? ""); if (next !== null) setPeriodOverride(next); }}><ToggleGroupItem value="7">7 d</ToggleGroupItem><ToggleGroupItem value="30">30 d</ToggleGroupItem><ToggleGroupItem value="60">60 d</ToggleGroupItem><ToggleGroupItem value="90">90 d</ToggleGroupItem><ToggleGroupItem value="180">180 d</ToggleGroupItem><ToggleGroupItem value="365">365 d</ToggleGroupItem></ToggleGroup><FieldDescription>Prioridad: selección manual, periodo escrito en la pregunta y, si falta, 30 días.</FieldDescription></Field><Field><FieldLabel htmlFor="ask-crm-currency">Moneda</FieldLabel><Input id="ask-crm-currency" value={currency} maxLength={3} placeholder="EUR (opcional)" onChange={(event) => setCurrency(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))} /><FieldDescription>Una única moneda ISO; nunca se aplica FX.</FieldDescription></Field><Field><FieldLabel>Horizonte</FieldLabel><Select value={String(horizon)} onValueChange={(value) => { const next = parseHorizon(value ?? ""); if (next !== null) setHorizon(next); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{horizons.map((item) => <SelectItem key={item} value={String(item)}>{item} días</SelectItem>)}</SelectGroup></SelectContent></Select></Field></div><Button disabled={question.trim().length < 3 || answer.isFetching} onClick={() => submit()}><SearchIcon data-icon="inline-start" />Consultar</Button></FieldGroup></CardContent></Card>

    {catalog.isPending ? <Skeleton className="h-24 w-full" /> : catalog.isError ? <Empty heading="No se pudo cargar el catálogo" description="No se habilitan consultas fuera del catálogo controlado por el servidor." /> : <Card size="sm"><CardHeader><CardTitle>Ejemplos disponibles</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{catalog.data?.map((item) => <Button key={item.id} size="xs" variant="outline" onClick={() => setQuestion(item.example)}>{item.title}</Button>)}</CardContent></Card>}

    {history.length ? <Card size="sm"><CardHeader><CardTitle>Historial de esta sesión</CardTitle><CardDescription>Máximo cinco preguntas; no se guarda en el navegador.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{history.map((item) => <Button key={item} size="xs" variant="ghost" onClick={() => setQuestion(item)}>{item}</Button>)}</CardContent></Card> : null}

    {answer.isFetching ? <div className="flex flex-col gap-3"><Skeleton className="h-36 w-full" /><Skeleton className="h-52 w-full" /></div> : answer.isError ? <Empty heading="No se pudo responder" description="No se muestran resultados parciales. Revisa el periodo y los filtros acotados." /> : !result ? <Empty heading="Escribe una pregunta" description="Selecciona un ejemplo o formula una pregunta en lenguaje natural." /> : result.status === "unsupported" ? <Empty heading="Pregunta no soportada" description={result.message} /> : result.status === "clarification_required" ? <Card><CardHeader><CardTitle>Necesito una aclaración</CardTitle><CardDescription>{result.message}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{result.clarification.options.map((option) => <Button key={option} variant="outline" onClick={() => { if (!submitted) return; const metric = option === "sales" || option === "margin" || option === "reaction" ? option : undefined; const isCurrency = /^[A-Z]{3}$/.test(option); const isIntent = !metric && !isCurrency; submit({ question: isIntent ? option : submitted.question, overrides: { ...submitted.overrides, metric, currency: isCurrency ? option : submitted.overrides?.currency } }); }}>{commercialUiLabel(option)}</Button>)}</CardContent></Card> : <>
      {result.status === "insufficient_evidence" ? <Empty heading="Evidencia insuficiente" description={result.summary} /> : <Card><CardHeader><CardTitle>{result.title}</CardTitle><CardDescription>{result.summary}</CardDescription></CardHeader><CardContent className="overflow-x-auto">{result.rows.length === 0 ? <Empty heading="Sin filas agregadas" description="La respuesta es válida, pero no hay grupos comparables que mostrar." /> : <Table><TableHeader><TableRow><TableHead>Grupo</TableHead><TableHead>Métrica</TableHead><TableHead>Valor</TableHead><TableHead>Muestra</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{result.rows.map((row) => <TableRow key={`${row.label}-${row.metric}`}><TableCell>{row.label}</TableCell><TableCell>{commercialUiLabel(row.metric)}</TableCell><TableCell>{formatValue(row.value, row.unit, result.explanation.currency ?? "")}</TableCell><TableCell>{row.sample ?? "—"}</TableCell><TableCell><Badge variant="outline">{commercialUiLabel(row.status)}</Badge></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>}
      <Card><CardHeader><div className="flex items-center gap-1"><CardTitle>Cómo se calculó</CardTitle><Information title="Cómo se calculó">Muestra el alcance temporal real del modelo de lectura, la moneda, la cobertura, las fuentes de datos, la fórmula y los límites. Este bloque aparece también cuando la evidencia es insuficiente.</Information></div><CardDescription>{result.explanation.interpretation}</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><div className="flex flex-wrap gap-2"><Badge variant="outline">{result.explanation.temporalScope.label}</Badge><Badge variant="outline">{result.explanation.timeZone}</Badge><Badge variant="outline">{result.explanation.currency ?? "Sin moneda"}</Badge><Badge variant="outline">Sin FX</Badge><Badge variant="outline">Total {result.explanation.total}</Badge><Badge variant="outline">Madura {result.explanation.matured}</Badge><Badge variant="outline">Excluida {result.explanation.excluded}</Badge></div><p className="text-sm"><strong>Definición:</strong> {result.explanation.definition}</p><p className="text-sm"><strong>Fórmula:</strong> {result.explanation.formula}</p><p className="text-sm"><strong>Mínimo:</strong> {result.explanation.minimum}</p><p className="text-sm"><strong>Fuentes de datos:</strong> {result.explanation.datasets.map(commercialUiLabel).join(", ")}</p><ul className="list-disc pl-5 text-sm text-muted-foreground">{result.explanation.limitations.map((item) => <li key={item}>{item}</li>)}</ul><a className="text-sm font-medium underline underline-offset-4" href={result.drilldown.route}>{result.drilldown.label}</a></CardContent></Card>
    </>}
  </main>;
}
