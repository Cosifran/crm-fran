"use client";

import { useState } from "react";
import { UserRoundPlus } from "lucide-react";
import { Button } from "@crm-fran/ui/components/button";

import { authClient } from "@/lib/auth-client";
import { usePermissionState } from "@crm-fran/ui/permissions";

import LeadDrawer from "@/components/lead-drawer/lead-drawer";
import AssignLeadForm from "./assign-lead-form";
import CloserQAForm from "./closer-qa-form";

// ── Public types ─────────────────────────────────────────────────────────────

export interface Lead {
    id: string;
    name: string;
    email: string;
	phone: string;
	type: "maestra" | "vsl";
	state: string;
    response: string;
    feedback: string;
    questions: {
        question: string;
        answer: string;
        authorRole: "caller" | "closer";
        authorId: string | null;
        questionKey?: string;
    }[];
    callerId: string | null;
    closerId: string | null;
    caller: { id: string; name: string; email: string } | null;
    closer: { id: string; name: string; email: string } | null;
    createdAt: string;
    updatedAt: string;
}

interface AssignLeadDrawerProps {
    lead: Lead;
    triggerLabel?: string;
    mode?: "default" | "agenda-feedback";
}

// ── Role detection ───────────────────────────────────────────────────────────

type DrawerRole = "role-admin" | "role-caller" | "role-closer";

function resolveRole(
    permissions: readonly string[],
    sessionRoleId: string | null | undefined,
): DrawerRole {
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
    lead,
    triggerLabel,
    mode = "default",
}: AssignLeadDrawerProps) {
    const [open, setOpen] = useState(false);
    const [closerSubmitLabel, setCloserSubmitLabel] = useState("Guardar");
    const [callerSubmitLabel, setCallerSubmitLabel] = useState("Guardar");

    const { data: session } = authClient.useSession();
    const { permissions } = usePermissionState();



    const role = resolveRole(
        permissions,
        (session?.user as { roleId?: string } | undefined)?.roleId,
    );
    const isAgendaFeedback = mode === "agenda-feedback";
    const showsCloserFeedback =
      role === "role-closer" || (isAgendaFeedback && role === "role-admin");
    const showsCallerActions =
      !isAgendaFeedback && (role === "role-caller" || role === "role-admin");

    // El id del form que el botón Guardar del drawer debe disparar.
    const submitFormId = showsCloserFeedback
      ? "closer-qa-form"
      : "assign-lead-form";

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
            title: "Gestionar lead",
            description: "Registra el contacto y el resultado de la gestión.",
        },
    };

    const { title, description } = isAgendaFeedback
      ? {
          title: "Feedback de agenda",
          description: "Registra qué ha ocurrido con esta agenda.",
        }
      : titleByRole[role];

    if (isAgendaFeedback && role === "role-caller") {
      return null;
    }

    return (
      <>
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          aria-label={triggerLabel ?? "Abrir drawer"}
        >
          <UserRoundPlus />
          {triggerLabel}
        </Button>

        <LeadDrawer
          open={open}
          onOpenChange={setOpen}
          title={title}
          description={description}
          type="edit"
          submitFormId={submitFormId}
          submitLabel={
            showsCloserFeedback
              ? closerSubmitLabel
              : callerSubmitLabel
          }
        >
          {showsCloserFeedback && (
            <CloserQAForm
              leadId={lead.id}
              currentCloserId={lead.closerId}
              leadQuestions={lead.questions.filter(
                (q) => q.authorRole === "closer",
              )}
              onCancel={() => setOpen(false)}
              onSuccess={() => setOpen(false)}
              onSubmitLabelChange={setCloserSubmitLabel}
            />
          )}

          {showsCallerActions && (
            <AssignLeadForm
              leadId={lead.id}
              onCancel={() => setOpen(false)}
              onSuccess={() => setOpen(false)}
              leadQuestions={lead.questions}
              currentCloserId={lead.closerId}
              onSubmitLabelChange={setCallerSubmitLabel}
            />
          )}
        </LeadDrawer>
      </>
    );
}
