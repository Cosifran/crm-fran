"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { useTrpcMutationWithToast } from "@/lib/use-trpc-mutation-with-toast";

export type Alert = {
  id: string;
  lead: { name: string } | null;
  targetUser: { name: string } | null;
  kind: string;
  severity: string;
  message: string;
  nextShowAt: Date | string;
};

export function useAlerts(
  filters: {
    leadId?: string;
    targetUserId?: string;
    includeDismissed?: boolean;
    includeResolved?: boolean;
    limit?: number;
    offset?: number;
  } = {},
) {
  return useQuery({
    ...trpc.alerts.listAlerts.queryOptions(filters),
    select: (data) =>
      data.map((alert) => ({
        id: alert.id,
        lead: alert.lead ? { name: alert.lead.name } : null,
        targetUser: alert.targetUser ? { name: alert.targetUser.name } : null,
        kind: alert.kind,
        severity: alert.severity,
        message: alert.message,
        nextShowAt: alert.nextShowAt,
      })),
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useTrpcMutationWithToast(
    {
      ...trpc.alerts.dismissAlert.mutationOptions(),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.alerts.listAlerts.queryKey(),
        });
      },
    },
    {
      success: "Alerta descartada",
      error: "Error al descartar la alerta",
    },
  );
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useTrpcMutationWithToast(
    {
      ...trpc.alerts.resolveAlert.mutationOptions(),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.alerts.listAlerts.queryKey(),
        });
      },
    },
    {
      success: "Alerta resuelta",
      error: "Error al resolver la alerta",
    },
  );
}
