"use client";

import { useQuery } from "@tanstack/react-query";

import { Empty } from "@crm-fran/ui/components/empty";
import { DataTable } from "@crm-fran/ui/components/data-table";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import { Can } from "@crm-fran/ui/permissions/can";

import { trpc } from "@/utils/trpc";
import { createAgendaColumns } from "@/features/agendas/agenda-columns";
import { filterAgendaLeads } from "@/features/agendas/agenda-utils";
import { AgendaRescheduleDialog } from "@/features/agendas/agenda-reschedule-dialog";
import LeadViewDrawer from "@/features/leads/lead-view-drawer";
import AssignLeadDrawer, {
  type Lead,
} from "@/features/leads/assign-lead-drawer";

export default function AgendasPage() {
  return (
    <Can permission="leads:read" fallback={<p>No tenés permisos</p>}>
      <AgendasPageContent />
    </Can>
  );
}

function AgendasPageContent() {
  const { data, isLoading, isError } = useQuery(
    trpc.leads.listAll.queryOptions(),
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return <p>Error al cargar agendas</p>;
  }

  const agendaLeads = filterAgendaLeads(data ?? []);

  if (agendaLeads.length === 0) {
    return <Empty heading="No hay agendas" />;
  }

  const agendaColumns = createAgendaColumns((lead) => (
    <div className="flex gap-2">
      <LeadViewDrawer
        lead={{
          questions: lead.questions.map((question) => ({
            questionKey: question.questionKey ?? "",
            question: question.question ?? question.questionKey ?? "",
            answer: question.answer,
            authorRole: question.authorRole,
            authorId: question.authorId ?? null,
          })),
          feedback: lead.feedback,
        }}
      />
      <AgendaRescheduleDialog lead={lead} />
      <AssignLeadDrawer
        lead={lead as unknown as Lead}
        triggerLabel="Feedback"
        mode="agenda-feedback"
      />
    </div>
  ));

  return (
    <div className="min-w-0 overflow-x-auto">
      <DataTable
        data={agendaLeads}
        columns={agendaColumns}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
