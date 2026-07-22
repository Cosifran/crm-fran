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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@crm-fran/ui/components/drawer";

import { UserRoundPlus } from "lucide-react";
import z from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Input } from "@crm-fran/ui/components/input";
import { Label } from "@crm-fran/ui/components/label";
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

  const form = useForm({
    defaultValues: {
      question1: "",
      question2: "",
      question3: "",
      question4: "",
    },
    onSubmit: async ({ value }) => {
    console.log(value);
    },
    validators: {
      onSubmit: z.object({
        question1: z.string().min(1, "Question 1 is required"),
        question2: z.string().min(1, "Question 2 is required"),
        question3: z.string().min(1, "Question 3 is required"),
        question4: z.string().min(1, "Question 4 is required"),
      }),
    },
  });

  return (
    <>
      <Drawer
        open={openDialog}
        onOpenChange={setOpenDialog}
        swipeDirection={"right"}
      >
        <DrawerTrigger
          render={
            <Button variant="outline" onClick={() => setOpenDialog(true)}>
              <UserRoundPlus />
            </Button>
          }
        />
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Are you absolutely sure?</DrawerTitle>
            <DrawerDescription>This action cannot be undone.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">{/* Content here */}</div>
          <DrawerFooter>
            <Button>Submit</Button>
            <DrawerClose render={<Button variant="outline" />}>
              Cancel
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
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
