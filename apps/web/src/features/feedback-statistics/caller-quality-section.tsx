"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@crm-fran/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crm-fran/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@crm-fran/ui/components/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@crm-fran/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm-fran/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm-fran/ui/components/table";

type QualityLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string | null;
  campaign: string | null;
};

type QualityMetrics = {
  assigned: number;
  contactedRate: number;
  appointmentRate: number;
  showRate: number;
  saleRate: number;
  averageFirstContactMinutes: number | null;
};

type Breakdown = QualityMetrics & { value: string };

type CallerQualityRow = QualityMetrics & {
  callerId: string;
  callerName: string;
  adjustedIndex: number;
  rank?: number;
  breakdowns: {
    profiles: Breakdown[];
    sources: Breakdown[];
    campaigns: Breakdown[];
  };
  leads: QualityLead[];
};

type TrendRow = QualityMetrics & {
  key: string;
  label: string;
  callerId: string;
  callerName: string;
};

export type CallerQualityData = {
  minimumSampleSize: number;
  methodology: string;
  ranked: CallerQualityRow[];
  insufficientSample: CallerQualityRow[];
  weekly: TrendRow[];
  monthly: TrendRow[];
};

const trendConfig = {
  appointmentRate: { label: "Agenda", color: "var(--chart-1)" },
  showRate: { label: "Asistencia", color: "var(--chart-2)" },
  saleRate: { label: "Venta", color: "var(--chart-3)" },
} satisfies ChartConfig;

function formatContactTime(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours} h` : `${hours} h ${remainingMinutes} min`;
}

export function CallerQualitySection({
  data,
  profileLabels,
}: {
  data: CallerQualityData;
  profileLabels: Record<string, string>;
}) {
  const [selectedCallerId, setSelectedCallerId] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [drilldown, setDrilldown] = useState<{
    title: string;
    leads: QualityLead[];
  } | null>(null);
  const callers = [...data.ranked, ...data.insufficientSample];
  const activeCaller = callers.find(({ callerId }) => callerId === selectedCallerId) ?? callers[0];
  const trends = (period === "weekly" ? data.weekly : data.monthly).filter(
    ({ callerId }) => callerId === activeCaller?.callerId,
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Ranking ajustado de callers</CardTitle>
          <p className="text-sm text-muted-foreground">{data.methodology}</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posición</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Índice ajustado</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Contactados</TableHead>
                <TableHead>Agenda</TableHead>
                <TableHead>Asistencia</TableHead>
                <TableHead>Venta</TableHead>
                <TableHead>Primer contacto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ranked.map((caller) => (
                <TableRow key={caller.callerId}>
                  <TableCell className="font-semibold">#{caller.rank}</TableCell>
                  <TableCell className="font-medium">{caller.callerName}</TableCell>
                  <TableCell className={caller.adjustedIndex >= 100 ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                    {caller.adjustedIndex}
                  </TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setDrilldown({ title: `Leads de ${caller.callerName}`, leads: caller.leads })}>{caller.assigned}</Button></TableCell>
                  <TableCell>{caller.contactedRate}%</TableCell>
                  <TableCell>{caller.appointmentRate}%</TableCell>
                  <TableCell>{caller.showRate}%</TableCell>
                  <TableCell>{caller.saleRate}%</TableCell>
                  <TableCell>{formatContactTime(caller.averageFirstContactMinutes)}</TableCell>
                </TableRow>
              ))}
              {data.ranked.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Ningún caller alcanza todavía la muestra mínima de {data.minimumSampleSize} leads.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {data.insufficientSample.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Sin ordenar por muestra insuficiente: {data.insufficientSample.map((caller) => `${caller.callerName} (${caller.assigned})`).join(", ")}.
            </p>
          )}
        </CardContent>
      </Card>

      {activeCaller && (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <BreakdownCard title="Resultados por perfil" rows={activeCaller.breakdowns.profiles} labels={profileLabels} />
            <BreakdownCard title="Resultados por origen" rows={activeCaller.breakdowns.sources} />
            <BreakdownCard title="Resultados por campaña" rows={activeCaller.breakdowns.campaigns} />
          </div>

          <Card>
            <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Evolución de conversión</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Agenda, asistencia y venta para el caller seleccionado.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={activeCaller.callerId} onValueChange={(value) => setSelectedCallerId(value ?? "")}>
                  <SelectTrigger className="w-48"><SelectValue>{activeCaller.callerName}</SelectValue></SelectTrigger>
                  <SelectContent><SelectGroup>{callers.map((caller) => <SelectItem key={caller.callerId} value={caller.callerId}>{caller.callerName}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
                <Button variant={period === "weekly" ? "default" : "outline"} onClick={() => setPeriod("weekly")}>Semanal</Button>
                <Button variant={period === "monthly" ? "default" : "outline"} onClick={() => setPeriod("monthly")}>Mensual</Button>
              </div>
            </CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">Sin datos para este intervalo.</div>
              ) : (
                <ChartContainer config={trendConfig} className="h-72 w-full">
                  <LineChart accessibilityLayer data={trends} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="appointmentRate" type="monotone" stroke="var(--color-appointmentRate)" strokeWidth={2} dot={false} />
                    <Line dataKey="showRate" type="monotone" stroke="var(--color-showRate)" strokeWidth={2} dot={false} />
                    <Line dataKey="saleRate" type="monotone" stroke="var(--color-saleRate)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={Boolean(drilldown)} onOpenChange={(open) => { if (!open) setDrilldown(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{drilldown?.title ?? "Leads del caller"}</DialogTitle>
            <DialogDescription>{drilldown?.leads.length ?? 0} leads incluidos en el cálculo.</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Email</TableHead><TableHead>Teléfono</TableHead><TableHead>Origen</TableHead><TableHead>Campaña</TableHead></TableRow></TableHeader>
            <TableBody>
              {drilldown?.leads.map((lead) => <TableRow key={lead.id}><TableCell className="font-medium">{lead.name}</TableCell><TableCell>{lead.email}</TableCell><TableCell>{lead.phone}</TableCell><TableCell>{lead.source ?? "—"}</TableCell><TableCell>{lead.campaign ?? "—"}</TableCell></TableRow>)}
              {drilldown?.leads.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No hay leads en este segmento.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
  labels,
}: {
  title: string;
  rows: readonly Breakdown[];
  labels?: Record<string, string>;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Segmento</TableHead><TableHead>Leads</TableHead><TableHead>Agenda</TableHead><TableHead>Show</TableHead><TableHead>Venta</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => <TableRow key={row.value}><TableCell className="font-medium">{labels?.[row.value] ?? row.value}</TableCell><TableCell>{row.assigned}</TableCell><TableCell>{row.appointmentRate}%</TableCell><TableCell>{row.showRate}%</TableCell><TableCell>{row.saleRate}%</TableCell></TableRow>)}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin datos.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
