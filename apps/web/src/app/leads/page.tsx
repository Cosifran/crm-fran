import { AssignedLeadsTable } from "@/features/leads/assigned-leads-table";

export default function LeadsPage() {
  return (
    <AssignedLeadsTable
      type="maestra"
      title="Leads personales"
      description="Leads de tipo maestra en los que participas como caller o closer."
    />
  );
}
