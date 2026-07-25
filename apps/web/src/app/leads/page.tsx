"use client";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@crm-fran/ui/components/data-table";
import { createLeadColumns } from "@/features/table/columns";
import LeadViewDrawer from "@/features/leads/lead-view-drawer";

export default function LeadsPage() {
    const leadsWithoutAssigned = useQuery(
        trpc.leads.listWithoutAssigned.queryOptions(),
    );

    const columns = createLeadColumns((lead) => (
        <LeadViewDrawer lead={lead} />
    ));

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <DataTable
                data={leadsWithoutAssigned.data ?? []}
                columns={columns}
                getRowId={(row) => row.id}
            />
        </div>
    );
}