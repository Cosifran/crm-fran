"use client";

import { Can } from "@crm-fran/ui/permissions/can";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import { Empty } from "@crm-fran/ui/components/empty";

import { AlertCard } from "@/features/alerts/alert-card";
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
    <div className="grid gap-4">
      {data.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onDismiss={(id) => dismiss.mutate({ id })}
          onResolve={(id) => resolve.mutate({ id })}
        />
      ))}
    </div>
  );
}
