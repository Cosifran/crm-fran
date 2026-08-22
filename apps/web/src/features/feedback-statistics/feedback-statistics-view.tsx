"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart } from "recharts";
import { FEEDBACK_PROFILES, MOTIVATION_ANGLES } from "@crm-fran/api/call-feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@crm-fran/ui/components/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@crm-fran/ui/components/chart";
import { Field, FieldError, FieldLabel } from "@crm-fran/ui/components/field";
import { Input } from "@crm-fran/ui/components/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@crm-fran/ui/components/select";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@crm-fran/ui/components/table";

import { trpc } from "@/utils/trpc";
import { selectFeedbackCaller } from "./feedback-statistics-filters";
import { buildFeedbackChartData, type FeedbackChartItem } from "./feedback-statistics-charts";

const profileLabels = Object.fromEntries(FEEDBACK_PROFILES.map(({ value, label }) => [value, label]));
const angleLabels = Object.fromEntries(MOTIVATION_ANGLES.map(({ value, label }) => [value, label]));
const chartConfig = { value: { label: "Feedbacks" } } satisfies ChartConfig;
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
];

export function FeedbackStatisticsView() {
  const [caller, setCaller] = useState({ id: "all", name: "Todos los callers" });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalidInterval = Boolean(from && to && from > to);
  const statistics = useQuery({
    ...trpc.leads.feedbackStatistics.queryOptions({ callerId: caller.id === "all" ? undefined : caller.id, from: from || undefined, to: to || undefined }),
    enabled: !invalidInterval,
  });
  const chartData = buildFeedbackChartData({
    profiles: statistics.data?.profiles ?? [],
    angles: statistics.data?.angles ?? [],
    profileLabels,
    angleLabels,
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pt-4 sm:pt-6">
      <div><h1 className="text-2xl font-semibold">Estadísticas de feedback</h1><p className="text-muted-foreground">Perfiles, motivaciones y reacción de los leads en los feedbacks guardados.</p></div>
      <Card><CardHeader><CardTitle>Filtros</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
        <Field><FieldLabel htmlFor="feedback-caller">Caller</FieldLabel><Select value={caller.id} onValueChange={(value) => setCaller(selectFeedbackCaller(statistics.data?.callers ?? [], value ?? "all"))}><SelectTrigger id="feedback-caller"><SelectValue>{caller.name}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los callers</SelectItem>{statistics.data?.callers.map((callerOption) => <SelectItem key={callerOption.id} value={callerOption.id}>{callerOption.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
        <Field><FieldLabel htmlFor="feedback-from">Desde</FieldLabel><Input id="feedback-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
        <Field invalid={invalidInterval}><FieldLabel htmlFor="feedback-to">Hasta</FieldLabel><Input id="feedback-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-invalid={invalidInterval} /><FieldError>{invalidInterval ? "La fecha final no puede ser anterior a la inicial" : ""}</FieldError></Field>
      </CardContent></Card>

      {statistics.isLoading ? <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div> : statistics.isError ? <Card><CardContent className="py-8 text-sm text-destructive">No se pudieron cargar las estadísticas.</CardContent></Card> : <>
        <div className="grid gap-4 md:grid-cols-3"><Metric title="Feedbacks" value={statistics.data?.totalFeedbacks ?? 0} /><Metric title="Con perfil" value={statistics.data?.classifiedFeedbacks ?? 0} /><Metric title="Conversión a agenda" value={`${statistics.data?.appointmentRate ?? 0}%`} /></div>
        <div className="grid gap-4 lg:grid-cols-3">
          <DonutChart title="Distribución de perfiles" data={chartData.profiles} />
          <DonutChart title="Reacción de los perfiles" data={chartData.reactions} />
          <DonutChart title="Ángulos de motivación" data={chartData.angles} />
        </div>
        <Card><CardHeader><CardTitle>Reacción por perfil</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Perfil</TableHead><TableHead>Subperfiles</TableHead><TableHead>Total</TableHead><TableHead>Agenda</TableHead><TableHead>Futuro</TableHead><TableHead>No interesado</TableHead><TableHead>No encaja</TableHead></TableRow></TableHeader><TableBody>
          {statistics.data?.profiles.map((profile) => <TableRow key={profile.profile}><TableCell className="font-medium">{profileLabels[profile.profile] ?? profile.profile}</TableCell><TableCell>{profile.subProfiles.map((sub) => `${profileLabels[sub.profile] ?? sub.profile} (${sub.total})`).join(", ") || "—"}</TableCell><TableCell>{profile.total}</TableCell><TableCell>{profile.reactions.appointment}</TableCell><TableCell>{profile.reactions.future_call}</TableCell><TableCell>{profile.reactions.not_interested}</TableCell><TableCell>{profile.reactions.not_fit}</TableCell></TableRow>)}
          {statistics.data?.profiles.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No hay feedbacks clasificados en este intervalo.</TableCell></TableRow>}
        </TableBody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle>Ángulos de motivación</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Ángulo</TableHead><TableHead>Total</TableHead><TableHead>Agenda</TableHead><TableHead>Futuro</TableHead><TableHead>No interesado</TableHead><TableHead>No encaja</TableHead></TableRow></TableHeader><TableBody>
          {statistics.data?.angles.map((angle) => <TableRow key={angle.angle}><TableCell className="font-medium">{angleLabels[angle.angle] ?? angle.angle}</TableCell><TableCell>{angle.total}</TableCell><TableCell>{angle.reactions.appointment}</TableCell><TableCell>{angle.reactions.future_call}</TableCell><TableCell>{angle.reactions.not_interested}</TableCell><TableCell>{angle.reactions.not_fit}</TableCell></TableRow>)}
          {statistics.data?.angles.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No hay ángulos registrados en este intervalo.</TableCell></TableRow>}
        </TableBody></Table></CardContent></Card>
      </>}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{value}</CardContent></Card>;
}

function DonutChart({ title, data }: { title: string; data: readonly FeedbackChartItem[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Sin datos para mostrar</div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-64">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} strokeWidth={2}>
                  {data.map((item, index) => <Cell key={item.key} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-2">
              {data.map((item, index) => (
                <div key={item.key} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-start gap-2"><span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} /><span>{item.name}</span></span>
                  <span className="shrink-0 font-medium">{item.value} · {Math.round((item.value / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
