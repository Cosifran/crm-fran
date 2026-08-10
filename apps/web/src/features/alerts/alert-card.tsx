"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm-fran/ui/components/card";
import { Badge } from "@crm-fran/ui/components/badge";
import { Button } from "@crm-fran/ui/components/button";
import { cn } from "@crm-fran/ui/lib/utils";

import {
  formatAlertCountdown,
  getAlertCountdownRemaining,
} from "./alert-countdown";
import { normalizeAlertSeverity } from "./alert-importance";
import type { Alert } from "./use-alerts";

interface AlertCardProps {
  alert: Alert;
  onDismiss: (id: string) => void;
  onResolve: (id: string) => void;
}

const SEVERITY_PRESENTATION = {
  urgent: { label: "Alta", className: "bg-destructive/10 text-destructive" },
  warning: { label: "Media", className: "bg-warning/15 text-warning-foreground" },
  info: { label: "Baja", className: "bg-success/15 text-success-foreground" },
} as const;

const KIND_LABEL = {
  no_contact: "No contact",
  follow_up: "Seguimiento",
} as const;

export function AlertCard({ alert, onDismiss, onResolve }: AlertCardProps) {
  const [now, setNow] = useState(() => Date.now());
  const severity = normalizeAlertSeverity(alert.severity);
  const presentation = severity
    ? SEVERITY_PRESENTATION[severity]
    : { label: alert.severity, className: "" };
  const kind = alert.kind as keyof typeof KIND_LABEL;
  const remainingMs = getAlertCountdownRemaining(
    alert.createdAt,
    alert.kind,
    now,
  );
  const countdown = formatAlertCountdown(remainingMs);
  const isExpired = remainingMs < 0;

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex flex-col gap-1">
            <CardTitle>{alert.lead?.name ?? "Lead"}</CardTitle>
            <CardDescription>
              Caller: {alert.lead?.caller?.name ?? "Sin caller"}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDismiss(alert.id)}
              >
                Descartar
              </Button>
              <Button size="sm" onClick={() => onResolve(alert.id)}>
                Resolver
              </Button>
              <Badge
                variant={severity ? "outline" : "default"}
                className={presentation.className}
              >
                {presentation.label}
              </Badge>
            </div>
            <p
              className={cn(
                "text-xs tabular-nums text-muted-foreground",
                isExpired && "text-destructive",
              )}
              aria-label={`Tiempo restante: ${countdown}`}
            >
              Tiempo: {countdown}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-1">
        <p className="text-xs font-medium">
          {KIND_LABEL[kind] ?? alert.kind}
        </p>
        <p className="text-xs text-muted-foreground">{alert.message}</p>
        <p className="text-xs text-muted-foreground">
          Próxima: {new Date(alert.nextShowAt).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
