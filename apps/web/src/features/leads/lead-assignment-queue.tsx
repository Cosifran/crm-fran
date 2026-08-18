"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRoundPlus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@crm-fran/ui/components/badge";
import { Button } from "@crm-fran/ui/components/button";
import { DataTable } from "@crm-fran/ui/components/data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@crm-fran/ui/components/card";
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
import { Empty } from "@crm-fran/ui/components/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm-fran/ui/components/select";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@crm-fran/ui/components/tabs";

import AssignLeadButton from "@/components/assign-lead-button";
import { createLeadColumns } from "@/features/table/columns";
import { useTrpcMutationWithToast } from "@/lib/use-trpc-mutation-with-toast";
import { trpc } from "@/utils/trpc";

type LeadType = "maestra" | "vsl";

export function LeadAssignmentQueue({
  type,
  title,
  description,
  overlayClassName,
}: {
  type: LeadType;
  title: string;
  description: string;
  overlayClassName?: string;
}) {
  const newLeads = useQuery(
    trpc.leads.listWithoutAssigned.queryOptions({ type, poolStatus: "new" }),
  );
  const recoveredLeads = useQuery(
    {
      ...trpc.leads.listWithoutAssigned.queryOptions({
        type,
        poolStatus: "recovered",
      }),
      enabled: newLeads.isSuccess,
    },
  );
  const discardedLeads = useQuery(
    {
      ...trpc.leads.listWithoutAssigned.queryOptions({
        type,
        poolStatus: "discarded",
      }),
      enabled: recoveredLeads.isSuccess,
    },
  );
  const availableColumns = createLeadColumns(
    (lead) => (
      <div className="flex items-center gap-2">
        <LeadTypeSelect
          leadId={lead.id}
          type={lead.type}
          overlayClassName={overlayClassName}
        />
        <AssignLeadDialog leadId={lead.id} />
      </div>
    ),
    { variant: "available" },
  );
  const recoveredColumns = createLeadColumns(
    (lead) => (
      <div className="flex items-center gap-2">
        <LeadTypeSelect
          leadId={lead.id}
          type={lead.type}
          overlayClassName={overlayClassName}
        />
        <AssignLeadDialog leadId={lead.id} />
      </div>
    ),
    { variant: "available", showRecoveryProgress: true },
  );
  const discardedColumns = createLeadColumns(() => null, {
    variant: "available",
    showRecoveryProgress: true,
    readOnly: true,
  });

  return (
    <section className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 py-4 md:py-6">
      <div className="flex flex-col gap-1 px-4 lg:px-6">
        <h1 data-slot="lead-queue-heading" className="text-2xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Tabs defaultValue="new">
        <TabsList variant="line" className="mx-4 lg:mx-6">
          <TabsTrigger value="new">
            Nuevos <Badge variant="secondary">{newLeads.data?.length ?? 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="recovered">
            Por contactar
            <Badge variant="secondary">{recoveredLeads.data?.length ?? 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="discarded">
            Descartados
            <Badge variant="secondary">{discardedLeads.data?.length ?? 0}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <LeadPoolCard
            title="Leads nuevos"
            description="Leads que todavía no han sido trabajados"
            emptyHeading="No hay leads nuevos"
            type={type}
            poolStatus="new"
            query={newLeads}
            columns={availableColumns}
          />
        </TabsContent>
        <TabsContent value="recovered">
          <LeadPoolCard
            title="Leads por contactar"
            description="Leads liberados después de vencer un intento de contacto"
            emptyHeading="No hay leads por contactar"
            type={type}
            poolStatus="recovered"
            query={recoveredLeads}
            columns={recoveredColumns}
          />
        </TabsContent>
        <TabsContent value="discarded">
          <LeadPoolCard
            title="Leads descartados"
            description="Leads que agotaron sus tres intentos de contacto"
            emptyHeading="No hay leads descartados"
            type={type}
            poolStatus="discarded"
            query={discardedLeads}
            columns={discardedColumns}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

type PoolQuery = {
  data?: Array<{ id: string }>;
  isLoading: boolean;
  isError: boolean;
};

function LeadPoolCard({
  title,
  description,
  emptyHeading,
  type,
  poolStatus,
  query,
  columns,
}: {
  title: string;
  description: string;
  emptyHeading: string;
  type: LeadType;
  poolStatus: "new" | "recovered" | "discarded";
  query: PoolQuery;
  columns: ColumnDef<any>[];
}) {
  const count = query.data?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}. {count === 1 ? "1 lead" : `${count} leads`}.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {query.isLoading ? (
          <div className="flex flex-col gap-3 px-4 lg:px-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : query.isError ? (
          <p className="px-4 text-destructive lg:px-6">
            Error al cargar los leads.
          </p>
        ) : query.data?.length ? (
          <div className="min-w-0 overflow-x-auto">
            <DataTable
              key={`${poolStatus}-${type}-${columns.length}`}
              data={query.data}
              columns={columns}
              getRowId={(row) => row.id}
            />
          </div>
        ) : (
          <div className="px-4 lg:px-6">
            <Empty heading={emptyHeading} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LeadTypeSelect({
  leadId,
  type,
  overlayClassName,
}: {
  leadId: string;
  type: LeadType;
  overlayClassName?: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useTrpcMutationWithToast(
    trpc.leads.setType.mutationOptions(),
    {
      success: "Tipo de lead actualizado",
      error: "No se pudo actualizar el tipo del lead",
    },
  );

  return (
    <Select
      value={type}
      disabled={mutation.isPending}
      onValueChange={(value) => {
        if (value !== "maestra" && value !== "vsl") return;
        mutation.mutate(
          { id: leadId, type: value },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({
                queryKey: trpc.leads.listWithoutAssigned.queryKey(),
              });
              queryClient.invalidateQueries({
                queryKey: trpc.leads.listAll.queryKey(),
              });
              queryClient.invalidateQueries({
                queryKey: trpc.leads.listByUserId.queryKey(),
              });
            },
          },
        );
      }}
    >
      <SelectTrigger aria-label="Cambiar tipo de lead">
        <SelectValue>{type === "vsl" ? "VSL" : "Maestra"}</SelectValue>
      </SelectTrigger>
      <SelectContent className={overlayClassName}>
        <SelectGroup>
          <SelectItem value="maestra">Maestra</SelectItem>
          <SelectItem value="vsl">VSL</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function AssignLeadDialog({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" aria-label="Asignarme este lead">
            <UserRoundPlus data-icon="inline-start" />
            Asignarme
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar asignación</DialogTitle>
          <DialogDescription>
            ¿Quieres asignarte este lead para comenzar a trabajarlo?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancelar
          </DialogClose>
          <AssignLeadButton leadId={leadId} closeDialog={() => setOpen(false)}>
            Confirmar
          </AssignLeadButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
