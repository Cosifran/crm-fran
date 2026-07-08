import { auth } from "@crm-fran/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DataTable } from "@crm-fran/ui/components/data-table";
import { SectionCards } from "@crm-fran/ui/components/section-cards";
import { ChartAreaInteractive } from "@crm-fran/ui/components/chart-area-interactive";

import { dashboardData } from "@/constants/constanst";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
        <DataTable data={dashboardData} />
      </div>
    </div>
  );
}
