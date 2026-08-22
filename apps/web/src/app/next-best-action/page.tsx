"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@crm-fran/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@crm-fran/ui/components/dialog";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import { Textarea } from "@crm-fran/ui/components/textarea";
import { Can } from "@crm-fran/ui/permissions/can";

import { NextBestActionView } from "@/features/alerts/next-best-action-view";
import { useNextBestActions, useNextBestActionMetrics, useRecordNextBestActionEvent } from "@/features/alerts/use-alerts";

export default function NextBestActionPage() {
  return <Can permission="alerts:read" fallback={<p>No tienes permisos</p>}><NextBestActionContent /></Can>;
}

function NextBestActionContent() {
  const { data = [], isLoading, isError } = useNextBestActions();
  const { data: metrics } = useNextBestActionMetrics();
  const event = useRecordNextBestActionEvent();
  const [skippedAction, setSkippedAction] = useState<(typeof data)[number] | null>(null);
  const [skipReason, setSkipReason] = useState("");
  type TrackableRecommendation = { lead: { id: string }; recommendationKey?: string };
  const shownKeys = useRef(new Set<string>());
  const pendingShownKeys = useRef(new Set<string>());
  const shownAttempts = useRef(new Map<string, number>());
  const shownTimers = useRef(new Map<string, number>());
  const activeShownKeys = useRef(new Set<string>());
  const record = async (action: TrackableRecommendation, kind: "recommendation_shown" | "recommendation_opened" | "recommendation_completed" | "recommendation_skipped", reason?: string) => {
    if (!action.recommendationKey) return;
    await event.mutateAsync({ leadId: action.lead.id, recommendationKey: action.recommendationKey, kind, ...(reason ? { reason } : {}) });
  };
  const markShown = (action: TrackableRecommendation) => {
    const key = action.recommendationKey;
    if (!key || shownKeys.current.has(key) || pendingShownKeys.current.has(key)) return;
    pendingShownKeys.current.add(key);
    void record(action, "recommendation_shown")
      .then(() => { if (activeShownKeys.current.has(key)) shownKeys.current.add(key); shownAttempts.current.delete(key); })
      .catch(() => {
        const attempt = (shownAttempts.current.get(key) ?? 0) + 1;
        shownAttempts.current.set(key, attempt);
        if (attempt <= 3 && activeShownKeys.current.has(key)) {
          const timeoutId = window.setTimeout(() => {
            shownTimers.current.delete(key);
            if (activeShownKeys.current.has(key)) markShown(action);
          }, 500 * 2 ** (attempt - 1));
          shownTimers.current.set(key, timeoutId);
        }
      })
      .finally(() => pendingShownKeys.current.delete(key));
  };
  useEffect(() => {
    const activeKeys = new Set(data.map((action) => action.recommendationKey).filter((key): key is string => Boolean(key)));
    activeShownKeys.current = activeKeys;
    for (const [key, timeoutId] of shownTimers.current) {
      if (!activeKeys.has(key)) {
        window.clearTimeout(timeoutId);
        shownTimers.current.delete(key);
        pendingShownKeys.current.delete(key);
        shownAttempts.current.delete(key);
      }
    }
    data.forEach(markShown);
  }, [data]);
  useEffect(() => () => {
    shownTimers.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    shownTimers.current.clear();
  }, []);  if (isLoading) return <div className="flex flex-col gap-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (isError) return <p>No se pudo calcular la próxima mejor acción.</p>;
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6"><header className="flex flex-col gap-1"><h1 className="text-2xl font-semibold">Próxima mejor acción</h1><p className="text-sm text-muted-foreground">Una cola de trabajo priorizada para actuar sobre el lead correcto en cada momento.</p></header>
    {metrics && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Mostradas", metrics.shown], ["Completadas", metrics.completed], ["Omitidas", metrics.skipped], ["Cumplimiento", `${metrics.complianceRate}%`], ["Reacción media", metrics.averageReactionMinutes === null ? "—" : `${metrics.averageReactionMinutes} min`]].map(([label, value]) => <div key={String(label)} className="border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>)}</div>}
    <NextBestActionView actions={data} onOpen={(action) => record(action, "recommendation_opened")} onCompleted={(action) => record(action, "recommendation_completed")} />
    {data[0] && <Button variant="outline" type="button" onClick={() => setSkippedAction(data[0] ?? null)}>Omitir acción principal</Button>}
    <Dialog open={Boolean(skippedAction)} onOpenChange={(open) => { if (!open) setSkippedAction(null); }}><DialogContent><DialogHeader><DialogTitle>Omitir recomendación</DialogTitle><DialogDescription>Indica por qué esta acción no aplica ahora.</DialogDescription></DialogHeader><Textarea aria-label="Motivo para omitir" value={skipReason} onChange={(change) => setSkipReason(change.target.value)} /><DialogFooter><Button variant="outline" type="button" onClick={() => setSkippedAction(null)}>Cancelar</Button><Button type="button" disabled={!skipReason.trim() || event.isPending} onClick={async () => { if (!skippedAction) return; await event.mutateAsync({ leadId: skippedAction.lead.id, recommendationKey: skippedAction.recommendationKey, kind: "recommendation_skipped", reason: skipReason }); setSkipReason(""); setSkippedAction(null); }}>Confirmar omisión</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}










