"use client";

import { Badge } from "@crm-fran/ui/components/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@crm-fran/ui/components/card";
import { Empty } from "@crm-fran/ui/components/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@crm-fran/ui/components/table";

import AssignLeadDrawer, { type Lead } from "@/features/leads/assign-lead-drawer";

type NextBestAction = {
  position: number;
  lead: Lead;
  actionType: string;
  score: number;
  urgency: "critical" | "high" | "medium" | "low";
  reasons: string[];
  scheduledAt: Date | string | null;
  attemptCount: number | null;
  minutesSinceAssignment: number | null;
  minutesSinceLastAttempt: number | null;
  recommendationKey?: string;
  sourceAlertId?: string | null;
};

const ACTION_LABELS: Record<string, string> = { no_contact: "Contactar ahora", follow_up: "Realizar seguimiento", future_call: "Realizar llamada programada", appointment: "Revisar agenda", rescheduled: "Gestionar reagenda" };
const URGENCY_LABELS: Record<NextBestAction["urgency"], string> = { critical: "Crítica", high: "Alta", medium: "Media", low: "Baja" };
function formatMinutes(minutes: number | null) { if (minutes === null) return null; if (minutes < 60) return `${minutes} min`; const hours = Math.floor(minutes / 60); const remainder = minutes % 60; return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`; }
function ActionBadge({ urgency }: { urgency: NextBestAction["urgency"] }) { return <Badge variant={urgency === "critical" ? "destructive" : "secondary"}>{URGENCY_LABELS[urgency]}</Badge>; }

export function NextBestActionView({ actions, onOpen, onCompleted }: { actions: readonly NextBestAction[]; onOpen?: (action: NextBestAction) => void | Promise<void>; onCompleted?: (action: NextBestAction) => void | Promise<void> }) {
  const first = actions[0];
  if (!first) return <Empty heading="No hay acciones pendientes" />;
  const remainingActions = actions.slice(1);
  return <div className="flex min-w-0 flex-col gap-6">
    <Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 flex-col gap-1"><CardDescription>Próxima acción recomendada</CardDescription><CardTitle>{first.lead.name}</CardTitle><CardDescription>{ACTION_LABELS[first.actionType] ?? "Gestionar lead"}</CardDescription></div><div className="flex items-center gap-2"><ActionBadge urgency={first.urgency} /><Badge variant="outline">Puntuación {first.score}</Badge></div></div></CardHeader><CardContent className="flex flex-col gap-4"><div className="flex flex-col gap-1"><p className="text-sm font-medium">Por qué aparece primero</p><ul className="list-disc pl-5 text-sm text-muted-foreground">{first.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div><div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"><span>Caller: {first.lead.caller?.name ?? "Sin caller"}</span>{first.attemptCount !== null && <span>Intentos: {first.attemptCount}</span>}{first.minutesSinceAssignment !== null && <span>Desde asignación: {formatMinutes(first.minutesSinceAssignment)}</span>}{first.scheduledAt && <span>Programada: {new Date(first.scheduledAt).toLocaleString()}</span>}</div></CardContent><CardFooter><AssignLeadDrawer lead={first.lead} triggerLabel="Gestionar ahora" onOpen={() => onOpen?.(first)} onCompleted={() => onCompleted?.(first)} /></CardFooter></Card>
    <Card><CardHeader><CardTitle>Siguientes acciones</CardTitle><CardDescription>Ordenadas mediante reglas transparentes de horario, urgencia y tiempo sin contacto.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Orden</TableHead><TableHead>Prioridad</TableHead><TableHead>Lead</TableHead><TableHead>Acción</TableHead><TableHead>Motivo principal</TableHead><TableHead>Acceso</TableHead></TableRow></TableHeader><TableBody>{remainingActions.map((action) => <TableRow key={action.recommendationKey ?? action.lead.id}><TableCell>#{action.position}</TableCell><TableCell><ActionBadge urgency={action.urgency} /></TableCell><TableCell className="font-medium">{action.lead.name}</TableCell><TableCell>{ACTION_LABELS[action.actionType] ?? "Gestionar lead"}</TableCell><TableCell>{action.reasons[0]}</TableCell><TableCell><AssignLeadDrawer lead={action.lead} triggerLabel="Abrir" onOpen={() => onOpen?.(action)} onCompleted={() => onCompleted?.(action)} /></TableCell></TableRow>)}{remainingActions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No hay más acciones pendientes.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
  </div>;
}
