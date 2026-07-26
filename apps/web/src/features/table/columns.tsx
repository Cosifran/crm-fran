"use client";

import AssignLeadButton from "@/components/assign-lead-button";
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
  renderAction: (lead: Lead) => React.ReactNode
): ColumnDef<Lead>[] {
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
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      accessorKey: "updatedAt",
      header: "Actualizado en",
      cell: ({ row }) =>
        new Date(row.original.updatedAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => renderAction(row.original),
    },
  ];
}
