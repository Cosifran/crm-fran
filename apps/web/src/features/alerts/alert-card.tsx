"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@crm-fran/ui/components/card";
import { Badge } from "@crm-fran/ui/components/badge";
import { Button } from "@crm-fran/ui/components/button";

import type { Alert } from "./use-alerts";

interface AlertCardProps {
  alert: Alert;
  onDismiss: (id: string) => void;
  onResolve: (id: string) => void;
}

const SEVERITY_VARIANT = {
  urgent: "destructive",
  warning: "secondary",
  info: "default",
} as const;

const KIND_LABEL = {
  no_contact: "No contact",
  follow_up: "Seguimiento",
} as const;

export function AlertCard({ alert, onDismiss, onResolve }: AlertCardProps) {
  const severity = alert.severity as keyof typeof SEVERITY_VARIANT;
  const kind = alert.kind as keyof typeof KIND_LABEL;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>{alert.lead?.name ?? "Lead"}</CardTitle>
            <CardDescription>
              {alert.targetUser?.name ?? "Sin asignar"}
            </CardDescription>
          </div>
          <Badge variant={SEVERITY_VARIANT[severity] ?? "default"}>
            {alert.severity}
          </Badge>
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

      <CardFooter className="flex justify-end gap-2">
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
      </CardFooter>
    </Card>
  );
}
