"use client";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@crm-fran/ui/components/data-table";
import { SectionCards } from "@crm-fran/ui/components/section-cards";
import { ChartAreaInteractive } from "@crm-fran/ui/components/chart-area-interactive";
import { createLeadColumns } from "@/features/table/columns";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@crm-fran/ui/components/dialog";
import { Button } from "@crm-fran/ui/components/button";
import AssignLeadButton from "@/components/assign-lead-button";

import { useState } from "react";
import { UserRoundPlus } from "lucide-react";


export default function Dashboard() {
  const leadsWithoutAssigned = useQuery(
    trpc.leads.listWithoutAssigned.queryOptions(),
  );

  const AssignLeadDialog = ({ leadId }: { leadId: string }) => {
    const [openDialog, setOpenDialog] = useState(false);
    return (
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogTrigger
          render={
            <Button variant="outline" onClick={() => setOpenDialog(true)}>
              <UserRoundPlus />
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>CONFIRMAR</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de assignar este lead?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                >
                  Close
                </Button>
              }
            />
            <AssignLeadButton
              leadId={leadId}
              closeDialog={() => setOpenDialog(false)}
            >
              Confirmar
            </AssignLeadButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const columns = createLeadColumns((lead) => <AssignLeadDialog leadId={lead.id} />);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable
        data={leadsWithoutAssigned.data ?? []}
        columns={columns}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
