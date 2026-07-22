
"use client";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@crm-fran/ui/components/data-table";
import { SectionCards } from "@crm-fran/ui/components/section-cards";
import { ChartAreaInteractive } from "@crm-fran/ui/components/chart-area-interactive";
import { leadColumns } from "@/features/table/columns";

export default function Dashboard() {
  const leadsWithoutAssigned = useQuery(
    trpc.leads.listWithoutAssigned.queryOptions(),
  );

  console.log(leadsWithoutAssigned.data);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable data={leadsWithoutAssigned.data ?? []} columns={leadColumns} getRowId={(row) => row.id} />
    </div>
  );
}