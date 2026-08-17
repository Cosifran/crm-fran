"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownIcon, UsersRoundIcon } from "lucide-react";

import { Badge } from "@crm-fran/ui/components/badge";
import { Button } from "@crm-fran/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@crm-fran/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@crm-fran/ui/components/dialog";
import { Empty } from "@crm-fran/ui/components/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@crm-fran/ui/components/field";
import { Input } from "@crm-fran/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm-fran/ui/components/select";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm-fran/ui/components/table";

import { trpc } from "@/utils/trpc";

type LeadTypeFilter = "all" | "maestra" | "vsl";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialInterval() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

const initialInterval = getInitialInterval();

export function ConversionFunnel() {
  const [from, setFrom] = useState(initialInterval.from);
  const [to, setTo] = useState(initialInterval.to);
  const [callerId, setCallerId] = useState("all");
  const [closerId, setCloserId] = useState("all");
  const [type, setType] = useState<LeadTypeFilter>("all");
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const invalidInterval = from > to;
  const funnel = useQuery({
    ...trpc.dashboard.conversionFunnel.queryOptions({
      from,
      to,
      callerId: callerId === "all" ? undefined : callerId,
      closerId: closerId === "all" ? undefined : closerId,
      type: type === "all" ? undefined : type,
    }),
    enabled: !invalidInterval,
    placeholderData: keepPreviousData,
  });
  const selected = funnel.data?.stages.find((stage) => stage.key === selectedStage);

  return (
    <section className="px-4 lg:px-6" aria-labelledby="conversion-funnel-title">
      <Card>
        <CardHeader>
          <CardTitle id="conversion-funnel-title">Embudo de conversión</CardTitle>
          <CardDescription>
            Sigue la evolución posterior de los leads asignados dentro del intervalo.
            Los filtros son independientes del resto del Dashboard. Las asignaciones
            antiguas sin fecha en el historial no se estiman.
          </CardDescription>
          <CardAction>
            <Badge variant="outline">Cohorte por asignación</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Field invalid={invalidInterval}>
              <FieldLabel htmlFor="funnel-from">Desde</FieldLabel>
              <Input
                id="funnel-from"
                type="date"
                value={from}
                max={to}
                aria-invalid={invalidInterval}
                onChange={(event) => setFrom(event.target.value)}
              />
              <FieldDescription>Fecha real de asignación.</FieldDescription>
            </Field>
            <Field invalid={invalidInterval}>
              <FieldLabel htmlFor="funnel-to">Hasta</FieldLabel>
              <Input
                id="funnel-to"
                type="date"
                value={to}
                min={from}
                aria-invalid={invalidInterval}
                onChange={(event) => setTo(event.target.value)}
              />
              {invalidInterval && (
                <FieldError>Hasta no puede ser anterior a Desde.</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="funnel-caller">Caller</FieldLabel>
              <Select value={callerId} onValueChange={(value) => setCallerId(value ?? "all")}>
                <SelectTrigger id="funnel-caller">
                  <SelectValue>
                    {callerId === "all"
                      ? "Todos los callers"
                      : funnel.data?.callers.find((caller) => caller.id === callerId)?.name ??
                        "Todos los callers"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos los callers</SelectItem>
                    {funnel.data?.callers.map((caller) => (
                      <SelectItem key={caller.id} value={caller.id}>
                        {caller.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="funnel-closer">Closer</FieldLabel>
              <Select value={closerId} onValueChange={(value) => setCloserId(value ?? "all")}>
                <SelectTrigger id="funnel-closer">
                  <SelectValue>
                    {closerId === "all"
                      ? "Todos los closers"
                      : funnel.data?.closers.find((closer) => closer.id === closerId)?.name ??
                        "Todos los closers"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos los closers</SelectItem>
                    {funnel.data?.closers.map((closer) => (
                      <SelectItem key={closer.id} value={closer.id}>
                        {closer.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="funnel-type">Tipo de lead</FieldLabel>
              <Select
                value={type}
                onValueChange={(value) => setType((value ?? "all") as LeadTypeFilter)}
              >
                <SelectTrigger id="funnel-type">
                  <SelectValue>
                    {type === "all" ? "Todos los tipos" : type === "vsl" ? "VSL" : "Maestra"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="maestra">Maestra</SelectItem>
                    <SelectItem value="vsl">VSL</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Fuente oculta: el modelo actual no conserva ese dato.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {invalidInterval ? (
            <Empty heading="Corrige el intervalo de fechas" />
          ) : funnel.isPending ? (
            <div className="flex flex-col gap-3" aria-label="Cargando embudo">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-11/12" />
              <Skeleton className="h-24 w-10/12" />
            </div>
          ) : funnel.isError ? (
            <Empty heading="No se pudo cargar el embudo" />
          ) : funnel.data ? (
            <>
              <div className="flex flex-col items-center gap-2">
                {funnel.data.stages.map((stage, index) => (
                  <div
                    key={stage.key}
                    className="flex w-full flex-col items-center gap-2"
                    style={{ maxWidth: `${100 - index * 9}%` }}
                  >
                    {index > 0 && <ArrowDownIcon className="text-muted-foreground" aria-hidden="true" />}
                    <Card size="sm" className="w-full bg-primary/5">
                      <CardHeader>
                        <CardTitle>{stage.label}</CardTitle>
                        <CardDescription>
                          {index === 0
                            ? "Base de la cohorte"
                            : `${stage.previousConversion}% desde la etapa anterior`}
                        </CardDescription>
                        <CardAction>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStage(stage.key)}
                          >
                            <UsersRoundIcon data-icon="inline-start" />
                            {stage.count}
                          </Button>
                        </CardAction>
                      </CardHeader>
                    </Card>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Conversión total a venta</p>
                  <p className="text-3xl font-semibold tabular-nums">
                    {funnel.data.totalConversion}%
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">No-show: {funnel.data.exits.noShow}</Badge>
                  <Badge variant="outline">
                    No interesado: {funnel.data.exits.notInterested}
                  </Badge>
                  <Badge variant="outline">Seguimiento: {funnel.data.exits.followUp}</Badge>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedStage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selected?.label ?? "Leads de la etapa"}</DialogTitle>
            <DialogDescription>
              Leads únicos incluidos en esta etapa para los filtros actuales.
            </DialogDescription>
          </DialogHeader>
          {selected && selected.leads.length > 0 ? (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead>Closer</TableHead>
                    <TableHead>Asignado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{lead.name}</span>
                          <span className="text-xs text-muted-foreground">{lead.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{lead.type === "vsl" ? "VSL" : "Maestra"}</TableCell>
                      <TableCell>{lead.callerName ?? "Sin nombre"}</TableCell>
                      <TableCell>{lead.closerName ?? "Sin asignar"}</TableCell>
                      <TableCell>
                        {new Intl.DateTimeFormat("es-ES", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(lead.assignedAt))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty heading="No hay leads en esta etapa" />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
