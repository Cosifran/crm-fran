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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm-fran/ui/components/select";

import { AlertCard } from "@/features/alerts/alert-card";
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
  useAlerts,
  useDismissAlert,
  useResolveAlert,
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
  const resolve = useResolveAlert();
  const [severityFilter, setSeverityFilter] =
    useState<AlertSeverityFilter>("all");
  const [callerFilter, setCallerFilter] =
    useState<AlertCallerFilter>("all");
  const callers = getAlertCallers(data ?? []);
  const selectedCaller = callers.find((caller) => caller.id === callerFilter);
  const severityFilteredAlerts = filterAlertsBySeverity(
    data ?? [],
    severityFilter,
  );
  const filteredAlerts = filterAlertsByCaller(
    severityFilteredAlerts,
    callerFilter,
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
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
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
            <SelectItem value="all">Todos los callers</SelectItem>
            {callers.map((caller) => (
              <SelectItem key={caller.id} value={caller.id}>
                {caller.name}
              </SelectItem>
            ))}
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
              onResolve={(id) => resolve.mutate({ id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
