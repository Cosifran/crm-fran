"use client";
import { SectionCards } from "@crm-fran/ui/components/section-cards";
import { ChartAreaInteractive } from "@crm-fran/ui/components/chart-area-interactive";
import { ConversionFunnel } from "@/features/dashboard/conversion-funnel";

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <ConversionFunnel />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
    </div>
  );
}
