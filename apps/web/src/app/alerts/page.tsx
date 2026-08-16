"use client";

import { useEffect, useState } from "react";

import { Can } from "@crm-fran/ui/permissions/can";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import { Empty } from "@crm-fran/ui/components/empty";
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
import { AlertPreferencesDialog } from "@/features/alerts/alert-preferences-dialog";
import {
  DEFAULT_ALERT_RELEVANCE_PREFERENCES,
  getEffectiveAlertSeverity,
} from "@/features/alerts/alert-relevance";
import {
  type AlertTypeFilter,
  filterAlertsByType,
} from "@/features/alerts/alert-type";
import {
  useAlerts,
  useAlertPreferences,
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
  const preferencesQuery = useAlertPreferences();
  const dismiss = useDismissAlert();
  const [filterNow, setFilterNow] = useState(() => Date.now());
  const [severityFilter, setSeverityFilter] =
    useState<AlertSeverityFilter>("all");
  const [callerFilter, setCallerFilter] =
    useState<AlertCallerFilter>("all");
  const [typeFilter, setTypeFilter] = useState<AlertTypeFilter>("all");
  const [closerFilter, setCloserFilter] =
    useState<AlertCloserFilter>("all");
  const relevancePreferences =
    preferencesQuery.data ?? DEFAULT_ALERT_RELEVANCE_PREFERENCES;
  const alertsWithEffectiveSeverity = (data ?? []).map((alert) => ({
    ...alert,
    severity:
      getEffectiveAlertSeverity(alert, relevancePreferences, filterNow) ??
      alert.severity,
  }));
  const callers = getAlertCallers(data ?? []);
  const closers = getAlertClosers(data ?? []);
  const selectedCaller = callers.find((caller) => caller.id === callerFilter);
  const selectedCloser = closers.find((closer) => closer.id === closerFilter);
  const severityFilteredAlerts = filterAlertsBySeverity(
    alertsWithEffectiveSeverity,
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

  useEffect(() => {
    const intervalId = window.setInterval(() => setFilterNow(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

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
        <Select
          value={severityFilter}
          onValueChange={(value) => {
            if (
              value === "all" ||
              value === "urgent" ||
              value === "warning" ||
              value === "info"
            ) {
              setSeverityFilter(value);
            }
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-44"
            aria-label="Filtrar alertas por relevancia"
          >
            <SelectValue>
              {severityFilter === "all"
                ? "Toda relevancia"
                : severityFilter === "urgent"
                  ? "Alta"
                  : severityFilter === "warning"
                    ? "Media"
                    : "Baja"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className={styles.overlayTheme}>
            <SelectGroup>
              <SelectItem value="all">Toda relevancia</SelectItem>
              <SelectItem value="urgent">Alta</SelectItem>
              <SelectItem value="warning">Media</SelectItem>
              <SelectItem value="info">Baja</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

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

        <AlertPreferencesDialog preferences={relevancePreferences} />
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
              relevancePreferences={relevancePreferences}
            />
          ))}
        </div>
      )}
    </div>
  );
}
