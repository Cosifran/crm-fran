"use client";

import { useState, useCallback } from "react";
import { UserRoundPlus } from "lucide-react";
import { Button } from "@crm-fran/ui/components/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@crm-fran/ui/components/tabs";

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

// ── Role detection ───────────────────────────────────────────────────────────

type DrawerRole = "role-admin" | "role-caller" | "role-closer";
type AdminTab = "caller" | "closer";

const FORM_ID_BY_ROLE_AND_TAB: Record<
    Exclude<DrawerRole, "role-admin">,
    string
> = {
    "role-caller": "assign-lead-form",
    "role-closer": "closer-qa-form",
};

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
}: AssignLeadDrawerProps) {
    const [open, setOpen] = useState(false);
    // Tab activo solo aplica al rol admin; los otros roles lo ignoran.
    const [adminTab, setAdminTab] = useState<AdminTab>("caller");
    const [closerSubmitLabel, setCloserSubmitLabel] = useState("Guardar");
    const [callerSubmitLabel, setCallerSubmitLabel] = useState("Guardar");

    const handleCloserSubmitLabelChange = useCallback((label: string) => {
        setCloserSubmitLabel(label);
    }, []);

    const handleCallerSubmitLabelChange = useCallback((label: string) => {
        setCallerSubmitLabel(label);
    }, []);

    const { data: session } = authClient.useSession();
    const { permissions } = usePermissionState();



    const role = resolveRole(
        permissions,
        (session?.user as { roleId?: string } | undefined)?.roleId,
    );

    // El id del form que el botón Guardar del drawer debe disparar.
    const submitFormId =
        role === "role-admin"
            ? adminTab === "caller"
                ? "admin-caller-form"
                : "admin-closer-form"
            : FORM_ID_BY_ROLE_AND_TAB[role as Exclude<DrawerRole, "role-admin">];

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
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          aria-label="Abrir drawer"
        >
          <UserRoundPlus />
        </Button>

        <LeadDrawer
          open={open}
          onOpenChange={setOpen}
          title={title}
          description={description}
          type="edit"
          submitFormId={submitFormId}
          submitLabel={
            role === "role-closer"
              ? closerSubmitLabel
              : role === "role-caller"
                ? callerSubmitLabel
                : "Guardar"
          }
        >
          {role === "role-admin" && (
            <div className="space-y-4">
              <Tabs
                value={adminTab}
                onValueChange={(v) => setAdminTab(v as AdminTab)}
                className="w-full"
              >
                <TabsList className="w-full">
                  <TabsTrigger value="caller" className="flex-1">
                    Sesión del caller
                  </TabsTrigger>
                  <TabsTrigger value="closer" className="flex-1">
                    Sesión del closer
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <AdminQAEditor
                activeTab={adminTab}
                initialCallerAnswers={MOCK_CALLER_ANSWERS}
                initialCloserAnswers={MOCK_CLOSER_ANSWERS}
              />
            </div>
          )}

          {role === "role-closer" && (
            <CloserQAForm
              leadId={lead.id}
              leadQuestions={lead.questions.filter(
                (q) => q.authorRole === "closer",
              )}
              onCancel={() => setOpen(false)}
              onSuccess={() => setOpen(false)}
              onSubmitLabelChange={handleCloserSubmitLabelChange}
            />
          )}

          {role === "role-caller" && (
            <AssignLeadForm
              leadId={lead.id}
              onCancel={() => setOpen(false)}
              onSuccess={() => setOpen(false)}
              leadQuestions={lead.questions}
              currentCloserId={lead.closerId}
              onSubmitLabelChange={handleCallerSubmitLabelChange}
            />
          )}
        </LeadDrawer>
      </>
    );
}
