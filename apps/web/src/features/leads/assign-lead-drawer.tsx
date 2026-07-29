"use client";

import { useState } from "react";
import { UserRoundPlus } from "lucide-react";
import { Button } from "@crm-fran/ui/components/button";

import { authClient } from "@/lib/auth-client";
import { usePermissionState } from "@crm-fran/ui/permissions";

import LeadDrawer from "@/components/lead-drawer/lead-drawer";
import AssignLeadForm from "./assign-lead-form";
import CloserQAForm from "./closer-qa-form";
import AdminQAEditor from "./admin-qa-editor";
import { CALLER_QUESTIONS, CLOSER_QUESTIONS } from "./qa-questions";

// ── Public types ─────────────────────────────────────────────────────────────

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
    caller: { id: string; name: string; email: string } | null;
    closer: { id: string; name: string; email: string } | null;
    createdAt: string;
    updatedAt: string;
}

interface AssignLeadDrawerProps {
    lead: Lead;
}

// ── Mock data (fase 1: UI estático) ──────────────────────────────────────────
// TODO phase 2: replace with real session + trpc.leads.getById
const MOCK_CALLER_ANSWERS: Record<string, string> = CALLER_QUESTIONS.reduce(
    (acc, question, index) => {
        acc[question] = index === 0 ? "Sí" : index === 1 ? "No" : `Respuesta caller #${index}`;
        return acc;
    },
    {} as Record<string, string>,
);

const MOCK_CLOSER_ANSWERS: Record<string, string> = CLOSER_QUESTIONS.reduce(
    (acc, question, index) => {
        acc[question] = index === 0 ? "Confirmado" : `Respuesta closer #${index}`;
        return acc;
    },
    {} as Record<string, string>,
);

const MOCK_LEAD: Lead = {
    id: "lead-mock",
    name: "Lead mock",
    email: "mock@example.com",
    phone: "+54 11 5555 5555",
    state: "Nuevo",
    response: "",
    feedback: "",
    callerId: "u-caller",
    closerId: "u-closer",
    caller: { id: "u-caller", name: "Caller mock", email: "caller@example.com" },
    closer: { id: "u-closer", name: "Closer mock", email: "closer@example.com" },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
};

// ── Role detection ───────────────────────────────────────────────────────────

type DrawerRole = "role-admin" | "role-caller" | "role-closer";

// TODO phase 2: derive role from session.user.roleId via authClient.
// Forzamos "caller" para que el dev server renderice el camino caller por defecto;
// el switch admin/closer se puede testear cambiando MOCK_ROLE abajo.
const MOCK_ROLE: DrawerRole = "role-closer";

function resolveRole(
    permissions: readonly string[],
    sessionRoleId: string | null | undefined,
): DrawerRole {
    if (MOCK_ROLE !== null) {
        return MOCK_ROLE;
    }
    if (permissions.includes("*")) {
        return "role-admin";
    }
    if (sessionRoleId === "role-closer") {
        return "role-closer";
    }
    return "role-caller";
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AssignLeadDrawer({
    lead: _lead,
}: AssignLeadDrawerProps) {
    const [open, setOpen] = useState(false);

    const { data: session } = authClient.useSession();
    const { permissions } = usePermissionState();

    console.log(permissions);

    const role = resolveRole(
        permissions,
        (session?.user as { roleId?: string } | undefined)?.roleId,
    );

    const titleByRole: Record<DrawerRole, { title: string; description: string }> = {
        "role-caller": {
            title: "Asignar lead",
            description: "Completá la información para asignar este lead a un closer.",
        },
        "role-closer": {
            title: "Editar respuestas (closer)",
            description: "Modificá tus respuestas registradas en la sesión.",
        },
        "role-admin": {
            title: "Editar sesión Q&A",
            description: "Modificá las respuestas del caller y del closer.",
        },
    };

    const { title, description } = titleByRole[role];

    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <UserRoundPlus />
        </Button>

        <LeadDrawer
          open={open}
          onOpenChange={setOpen}
          title={title}
          description={description}
          type="edit"
        >
          {role === "role-admin" && (
            <AdminQAEditor
              initialCallerAnswers={MOCK_CALLER_ANSWERS}
              initialCloserAnswers={MOCK_CLOSER_ANSWERS}
            />
          )}

          {role === "role-closer" && (
            <CloserQAForm
              initialAnswers={MOCK_CLOSER_ANSWERS}
              isEditing={true}
            />
          )}

          {role === "role-caller" && (
            <AssignLeadForm
              leadId={MOCK_LEAD.id}
              onCancel={() => setOpen(false)}
              onSuccess={() => setOpen(false)}
            />
          )}
        </LeadDrawer>
      </>
    );
}
