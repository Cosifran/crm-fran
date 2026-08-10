"use client";

import { useState } from "react";

import { Can } from "@crm-fran/ui/permissions/can";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import { Empty } from "@crm-fran/ui/components/empty";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@crm-fran/ui/components/toggle-group";

import { AlertCard } from "@/features/alerts/alert-card";
import {
  type AlertSeverityFilter,
  filterAlertsBySeverity,
} from "@/features/alerts/alert-importance";
import {
  useAlerts,
  useDismissAlert,
  useResolveAlert,
} from "@/features/alerts/use-alerts";

export default function AlertsPage() {
  return (
    <Can permission="alerts:read" fallback={<p>No tenés permisos</p>}>
      <AlertsInbox />
    </Can>
  );
}

function AlertsInbox() {
  const { data, isLoading, isError } = useAlerts();
  const dismiss = useDismissAlert();
  const resolve = useResolveAlert();
  const [severityFilter, setSeverityFilter] =
    useState<AlertSeverityFilter>("all");
  const filteredAlerts = filterAlertsBySeverity(data ?? [], severityFilter);

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

      {filteredAlerts.length === 0 ? (
        <Empty heading="No hay alertas para este filtro" />
      ) : (
        <div className="grid gap-4">
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
