"use client";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@crm-fran/ui/components/data-table";
import { createLeadColumns } from "@/features/table/columns";
import LeadViewDrawer from "@/features/leads/lead-view-drawer";
import AssignLeadDrawer from "@/features/leads/assign-lead-drawer";

export default function LeadsPage() {
    const leads = useQuery(
        trpc.leads.listByUserId.queryOptions(),
    );

    console.log(leads.data);

    const columns = createLeadColumns((lead) => (
      <div className="flex gap-2">
        <LeadViewDrawer lead={lead} />
        <AssignLeadDrawer lead={lead} />
      </div>
    ));

    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <DataTable
          data={leads.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
        />
      </div>
    );
}