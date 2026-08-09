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
import { getCallerResponseStatus } from "../leads/response-status";

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
      cell: ({ row }) => getCallerResponseStatus(row.original.questions),
    },
    {
      accessorKey: "feedback",
      header: "Feedback",
    },
    {
      accessorKey: "callerId",
      header: "Caller",
      cell: ({ row }) => row.original.caller?.name ?? "Sin asignar",
    },
    {
      accessorKey: "closerId",
      header: "Closer",
      cell: ({ row }) => row.original.closer?.name ?? "Sin asignar",
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
      id: "updatedAtTime",
      header: "Hora de actualización",
      cell: ({ row }) =>
        new Date(row.original.updatedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => renderAction(row.original),
    },
  ];
}
