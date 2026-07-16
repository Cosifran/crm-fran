import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@crm-fran/ui/components/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@crm-fran/ui/components/select"

export interface Lead {
    id: string
    name: string
    email: string
    phone: string
    state: string
    response: string
    feedback: string
    callerId: string | null
    closerId: string | null
    createdAt: string
    updatedAt: string
}

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
            )
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
            return new Date(row.original.createdAt).toLocaleDateString()
        },
    },
    {
        accessorKey: "updatedAt",
        header: "Actualizado en",
        cell: ({ row }) => {
            return new Date(row.original.updatedAt).toLocaleDateString()
        },
    },

]