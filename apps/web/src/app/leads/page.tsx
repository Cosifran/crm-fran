"use client";
import { useState } from "react";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { DataTable } from "@crm-fran/ui/components/data-table";
import { createLeadColumns } from "@/features/table/columns";
import LeadViewDrawer from "@/features/leads/lead-view-drawer";
import AssignLeadDrawer from "@/features/leads/assign-lead-drawer";
import { DateRangePicker } from "@/components/date-range-picker";

export default function LeadsPage() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [dateRange, setDateRange] = useState<{
    from?: string;
    to?: string;
  }>();

  const isAdmin = session?.user?.roleId === "role-admin";

  // Both queries return the same data shape; only one is enabled at a time
  const allLeadsQuery = useQuery({
    ...trpc.leads.listAll.queryOptions(dateRange),
    enabled: !isSessionPending && !!session && isAdmin,
  });

  const userLeadsQuery = useQuery({
    ...trpc.leads.listByUserId.queryOptions(dateRange),
    enabled: !isSessionPending && !!session && !isAdmin,
  });

  const leads = isAdmin ? allLeadsQuery.data : userLeadsQuery.data;
  const isLoading = isAdmin ? allLeadsQuery.isLoading : userLeadsQuery.isLoading;

  const columns = createLeadColumns((lead) => (
    <div className="flex gap-2">
      <LeadViewDrawer lead={lead} />
      <AssignLeadDrawer lead={lead} />
    </div>
  ));

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <DateRangePicker
        from={dateRange?.from}
        to={dateRange?.to}
        onChange={setDateRange}
      />
      <DataTable
        data={leads ?? []}
        columns={columns}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
