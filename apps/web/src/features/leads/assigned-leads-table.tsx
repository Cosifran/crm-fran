"use client";
import { useEffect, useState } from "react";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { DataTable } from "@crm-fran/ui/components/data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@crm-fran/ui/components/card";
import { createLeadColumns } from "@/features/table/columns";
import LeadViewDrawer from "@/features/leads/lead-view-drawer";
import AssignLeadDrawer from "@/features/leads/assign-lead-drawer";
import { getCallerResponseStatus } from "@/features/leads/response-status";
import { DateRangePicker } from "@/components/date-range-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm-fran/ui/components/select";

type DateField = "createdAt" | "updatedAt";
type CloserFilter = "all" | string;
type ResponseFilter = "all" | "Si" | "No" | "Sin asignar";

function parseLocalDate(isoDate: string | undefined, endOfDay = false) {
  if (!isoDate) return undefined;

  const parts = isoDate.split("-");
  if (parts.length !== 3) return undefined;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined;
  }

  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

type LeadType = "maestra" | "vsl";

export function AssignedLeadsTable({
  type,
  title,
  description,
  assignedOnly = false,
  overlayClassName,
}: {
  type: LeadType;
  title: string;
  description: string;
  assignedOnly?: boolean;
  overlayClassName?: string;
}) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [dateRange, setDateRange] = useState<{
    from?: string;
    to?: string;
  }>();
  const [dateField, setDateField] = useState<DateField>("createdAt");
  const [selectedCloserId, setSelectedCloserId] = useState<CloserFilter>("all");
  const [selectedResponse, setSelectedResponse] =
    useState<ResponseFilter>("all");

  const isAdmin = session?.user?.roleId === "role-admin";

  // Both queries return the same data shape; only one is enabled at a time
  const allLeadsQuery = useQuery({
    ...trpc.leads.listAll.queryOptions(),
    enabled: !isSessionPending && !!session && isAdmin,
  });

  const userLeadsQuery = useQuery({
    ...trpc.leads.listByUserId.queryOptions(),
    enabled: !isSessionPending && !!session && !isAdmin,
  });

  const rawLeads = isAdmin ? allLeadsQuery.data : userLeadsQuery.data;
  const leads = rawLeads?.filter(
    (lead) =>
      lead.type === type &&
      (!assignedOnly || lead.callerId !== null || lead.closerId !== null),
  );
  const availableClosers = Array.from(
    new Map(
      leads?.flatMap((lead) =>
        lead.closerId === null
          ? []
          : [[lead.closerId, lead.closer?.name ?? "Sin asignar"]]
      ) ?? []
    ),
  ).map(([id, name]) => ({ id, name }));
  const availableCloserIds = availableClosers.map(({ id }) => id);
  const activeCloserId =
    selectedCloserId === "all" || availableCloserIds.includes(selectedCloserId)
      ? selectedCloserId
      : "all";
  const activeCloserName =
    activeCloserId === "all"
      ? "Todos los closers"
      : availableClosers.find(({ id }) => id === activeCloserId)?.name ?? "Sin asignar";
  useEffect(() => {
    if (selectedCloserId !== "all" && !availableCloserIds.includes(selectedCloserId)) {
      setSelectedCloserId("all");
    }
  }, [availableCloserIds, selectedCloserId]);
  const fromDate = parseLocalDate(dateRange?.from);
  const toDate = parseLocalDate(dateRange?.to, true);
  const filteredLeads = leads?.filter((lead) => {
    let matchesDate = true;
    if (fromDate || toDate) {
      const leadDate = new Date(lead[dateField]);
      matchesDate =
        !Number.isNaN(leadDate.getTime()) &&
        (!fromDate || leadDate >= fromDate) &&
        (!toDate || leadDate <= toDate);
    }
    const matchesCloser = activeCloserId === "all" || lead.closerId === activeCloserId;
    const matchesResponse =
      selectedResponse === "all" ||
      getCallerResponseStatus(lead.questions) === selectedResponse;

    return matchesDate && matchesCloser && matchesResponse;
  });

  const columns = createLeadColumns((lead) => (
    <div className="flex gap-2">
      <LeadViewDrawer lead={lead} />
      <AssignLeadDrawer lead={lead} />
    </div>
  ));

  return (
    <section className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 py-4 md:py-6">
      <div className="flex flex-col gap-1 px-4 lg:px-6">
        <h1 data-slot="assigned-leads-heading" className="text-2xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Combina fecha, closer y respuesta para encontrar tus leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div
            data-slot="assigned-lead-filters"
            className="flex flex-wrap items-center gap-2 px-4 lg:px-6"
          >
            <DateRangePicker
              from={dateRange?.from}
              to={dateRange?.to}
              onChange={setDateRange}
            />
            <Select
              value={dateField}
              onValueChange={(value) => {
                if (value === "createdAt" || value === "updatedAt") {
                  setDateField(value);
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full min-w-0 sm:w-[180px]"
                aria-label="Campo de fecha para filtrar"
              >
                <SelectValue>
                  {dateField === "createdAt"
                    ? "Fecha de creación"
                    : "Fecha de actualización"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={overlayClassName}>
                <SelectGroup>
                  <SelectItem value="createdAt">Fecha de creación</SelectItem>
                  <SelectItem value="updatedAt">Fecha de actualización</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={activeCloserId}
              onValueChange={(value) => setSelectedCloserId(value ?? "all")}
            >
              <SelectTrigger
                size="sm"
                className="w-full min-w-0 sm:w-[180px]"
                aria-label="Closer para filtrar"
              >
                <SelectValue>{activeCloserName}</SelectValue>
              </SelectTrigger>
              <SelectContent className={overlayClassName}>
                <SelectGroup>
                  <SelectItem value="all">Todos los closers</SelectItem>
                  {availableClosers.map(({ id, name }) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={selectedResponse}
              onValueChange={(value) => {
                if (
                  value === "all" ||
                  value === "Si" ||
                  value === "No" ||
                  value === "Sin asignar"
                ) {
                  setSelectedResponse(value);
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full min-w-0 sm:w-[180px]"
                aria-label="Respuesta para filtrar"
              >
                <SelectValue>
                  {selectedResponse === "all"
                    ? "Todas las respuestas"
                    : selectedResponse}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={overlayClassName}>
                <SelectGroup>
                  <SelectItem value="all">Todas las respuestas</SelectItem>
                  <SelectItem value="Si">Si</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Sin asignar">Sin asignar</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leads asignados</CardTitle>
          <CardDescription>
            {filteredLeads?.length === 1
              ? "1 lead encontrado"
              : `${filteredLeads?.length ?? 0} leads encontrados`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="min-w-0 overflow-x-auto">
            <DataTable
              data={filteredLeads ?? []}
              columns={columns}
              getRowId={(row) => row.id}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
