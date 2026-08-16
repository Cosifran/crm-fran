"use client";

import { useState } from "react";

import { Can } from "@crm-fran/ui/permissions/can";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import { Empty } from "@crm-fran/ui/components/empty";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@crm-fran/ui/components/toggle-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm-fran/ui/components/select";

import { AlertCard } from "@/features/alerts/alert-card";
import {
  type AlertCloserFilter,
  filterAlertsByCloser,
  getAlertClosers,
} from "@/features/alerts/alert-closer";
import {
  type AlertCallerFilter,
  filterAlertsByCaller,
  getAlertCallers,
} from "@/features/alerts/alert-caller";
import {
  type AlertSeverityFilter,
  filterAlertsBySeverity,
} from "@/features/alerts/alert-importance";
import {
  type AlertTypeFilter,
  filterAlertsByType,
} from "@/features/alerts/alert-type";
import {
  useAlerts,
  useDismissAlert,
} from "@/features/alerts/use-alerts";

import styles from "./alerts.module.css";

export default function AlertsPage() {
  return (
    <div className={styles.theme}>
      <Can permission="alerts:read" fallback={<p>No tenés permisos</p>}>
        <AlertsInbox />
      </Can>
    </div>
  );
}

function AlertsInbox() {
  const { data, isLoading, isError } = useAlerts();
  const dismiss = useDismissAlert();
  const [severityFilter, setSeverityFilter] =
    useState<AlertSeverityFilter>("all");
  const [callerFilter, setCallerFilter] =
    useState<AlertCallerFilter>("all");
  const [typeFilter, setTypeFilter] = useState<AlertTypeFilter>("all");
  const [closerFilter, setCloserFilter] =
    useState<AlertCloserFilter>("all");
  const callers = getAlertCallers(data ?? []);
  const closers = getAlertClosers(data ?? []);
  const selectedCaller = callers.find((caller) => caller.id === callerFilter);
  const selectedCloser = closers.find((closer) => closer.id === closerFilter);
  const severityFilteredAlerts = filterAlertsBySeverity(
    data ?? [],
    severityFilter,
  );
  const callerFilteredAlerts = filterAlertsByCaller(
    severityFilteredAlerts,
    callerFilter,
  );
  const typeFilteredAlerts = filterAlertsByType(
    callerFilteredAlerts,
    typeFilter,
  );
  const filteredAlerts = filterAlertsByCloser(
    typeFilteredAlerts,
    closerFilter,
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    return <p>Error al cargar alertas</p>;
  }

  if (!data || data.length === 0) {
    return <Empty heading="No hay alertas pendientes" />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-3 px-2 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-3 sm:pt-5">
        <ToggleGroup
          multiple={false}
          value={[severityFilter]}
          onValueChange={(value) => {
            const nextValue = value[0];
            if (
              nextValue === "all" ||
              nextValue === "urgent" ||
              nextValue === "warning" ||
              nextValue === "info"
            ) {
              setSeverityFilter(nextValue);
            }
          }}
          variant="outline"
          size="sm"
          className="max-w-full overflow-x-auto"
          aria-label="Filtrar alertas por importancia"
        >
          <ToggleGroupItem value="all">Todas</ToggleGroupItem>
          <ToggleGroupItem value="urgent">Alta</ToggleGroupItem>
          <ToggleGroupItem value="warning">Media</ToggleGroupItem>
          <ToggleGroupItem value="info">Baja</ToggleGroupItem>
        </ToggleGroup>

        <Select
          value={callerFilter}
          onValueChange={(value) => setCallerFilter(value ?? "all")}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-52"
            aria-label="Filtrar alertas por caller"
          >
            <SelectValue>
              {callerFilter === "all"
                ? "Todos los callers"
                : selectedCaller?.name ?? "Todos los callers"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className={styles.overlayTheme}>
            <SelectGroup>
              <SelectItem value="all">Todos los callers</SelectItem>
              {callers.map((caller) => (
                <SelectItem key={caller.id} value={caller.id}>
                  {caller.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(value) => {
            if (
              value === "all" ||
              value === "follow_up" ||
              value === "appointment" ||
              value === "future_call" ||
              value === "rescheduled"
            ) {
              setTypeFilter(value);
            }
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-44"
            aria-label="Filtrar alertas por tipo"
          >
            <SelectValue>
              {typeFilter === "all"
                ? "Todos los tipos"
                : typeFilter === "follow_up"
                  ? "Seguimiento"
                  : typeFilter === "appointment"
                    ? "Agenda"
                    : typeFilter === "future_call"
                      ? "Llamar futuro"
                      : "Reagenda"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className={styles.overlayTheme}>
            <SelectGroup>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="follow_up">Seguimiento</SelectItem>
              <SelectItem value="appointment">Agenda</SelectItem>
              <SelectItem value="future_call">Llamar futuro</SelectItem>
              <SelectItem value="rescheduled">Reagenda</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={closerFilter}
          onValueChange={(value) => setCloserFilter(value ?? "all")}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-52"
            aria-label="Filtrar alertas por closer"
          >
            <SelectValue>
              {closerFilter === "all"
                ? "Todos los closers"
                : selectedCloser?.name ?? "Todos los closers"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className={styles.overlayTheme}>
            <SelectGroup>
              <SelectItem value="all">Todos los closers</SelectItem>
              {closers.map((closer) => (
                <SelectItem key={closer.id} value={closer.id}>
                  {closer.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {filteredAlerts.length === 0 ? (
        <Empty heading="No hay alertas para este filtro" />
      ) : (
        <div className="mx-auto grid w-full max-w-5xl gap-4">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={(id) => dismiss.mutate({ id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
