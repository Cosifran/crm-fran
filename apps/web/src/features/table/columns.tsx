"use client";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm-fran/ui/components/select";
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
import { UserRoundPlus } from "lucide-react";
import { Button } from "@crm-fran/ui/components/button";
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  state: string;
  response: string;
  feedback: string;
  callerId: string | null;
  closerId: string | null;
  createdAt: string;
  updatedAt: string;
}
import AssignLeadButton from "@/components/assign-lead-button";
import { useState } from "react";

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

export const leadColumns: ColumnDef<Lead>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "email",
    header: "Correo",
  },
  {
    accessorKey: "phone",
    header: "Teléfono",
  },
  {
    accessorKey: "state",
    header: "Estado",
    cell: ({ row }) => {
      return (
        <Select defaultValue={row.original.state}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="sin asignar">Sin asignar</SelectItem>
            <SelectItem value="Asignado">Asignado</SelectItem>
            <SelectItem value="Número erróneo">Número erróneo</SelectItem>
          </SelectContent>
        </Select>
      );
    },
  },
  {
    accessorKey: "response",
    header: "Respuesta",
    cell: ({ row }) => (
      <Select defaultValue={row.original.response}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="SI">SI</SelectItem>
          <SelectItem value="NO">NO</SelectItem>
        </SelectContent>
      </Select>
    ),
  },
  {
    accessorKey: "feedback",
    header: "Feedback",
  },
  {
    accessorKey: "callerId",
    header: "Caller ID",
  },
  {
    accessorKey: "closerId",
    header: "Closer ID",
  },
  {
    accessorKey: "createdAt",
    header: "Creado en",

    cell: ({ row }) => {
      return new Date(row.original.createdAt).toLocaleDateString();
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Actualizado en",
    cell: ({ row }) => {
      return new Date(row.original.updatedAt).toLocaleDateString();
    },
  },
  {
    accessorKey: "actions",
    header: "Acciones",
    cell: ({ row }) => <AssignLeadDialog leadId={row.original.id} />,
  },
];
