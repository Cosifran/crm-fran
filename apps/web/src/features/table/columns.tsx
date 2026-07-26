"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm-fran/ui/components/select";
import type { ColumnDef } from "@tanstack/react-table";
import type { Lead } from "../leads/assign-lead-drawer";


export function createLeadColumns(
  renderAction: (lead: Lead) => React.ReactNode,
): ColumnDef<any>[] {
  return [
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
    },
    {
      accessorKey: "response",
      header: "Respuesta",
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
      cell: ({ row }) => row.original.closerId || "sin asignar",
    },
    {
      accessorKey: "createdAt",
      header: "Creado en",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      accessorKey: "updatedAt",
      header: "Actualizado en",
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => renderAction(row.original),
    },
  ];
}
