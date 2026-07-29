"use client";

import { usePermissionState } from "@crm-fran/ui/permissions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@crm-fran/ui/components/tabs";
import { Label } from "@crm-fran/ui/components/label";

import { authClient } from "@/lib/auth-client";

import QASessionPanelComponent from "./qa-session-panel";

// ── Local pure helpers (avoid bundling server-side @crm-fran/api) ────────────

interface QASessionItem {
  question: string;
  answer: string;
  authorRole: "caller" | "closer";
  authorId: string | null;
}

function partitionQASession(items: readonly QASessionItem[]): {
  caller: QASessionItem[];
  closer: QASessionItem[];
} {
  const caller: QASessionItem[] = [];
  const closer: QASessionItem[] = [];
  for (const item of items) {
    if (item.authorRole === "closer") {
      closer.push(item);
    } else {
      caller.push(item);
    }
  }
  return { caller, closer };
}

function isCloserOf(lead: { closerId: string | null }, userId: string): boolean {
  return lead.closerId !== null && lead.closerId === userId;
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface LeadDetailsData {
  id: string;
  closerId: string | null;
  questions: QASessionItem[];
}

interface LeadDetailsProps {
  lead: LeadDetailsData;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LeadDetails({ lead }: LeadDetailsProps) {
  const { data: session } = authClient.useSession();
  const { permissions } = usePermissionState();

  const userId = session?.user?.id;
  const isAdmin = permissions.includes("*");
  const isCloser = userId != null && isCloserOf(lead, userId);

  const { caller: callerItems, closer: closerItems } = partitionQASession(lead.questions ?? []);

  const callerEditable = isAdmin;
  const closerEditable = isAdmin || isCloser;

  return (
    <>
      {/* ── Mobile: Tabs ──────────────────────────────────────────── */}
      <div className="md:hidden">
        <Tabs defaultValue="caller">
          <TabsList className="w-full">
            <TabsTrigger value="caller" className="flex-1">
              Sesión del caller
            </TabsTrigger>
            <TabsTrigger value="closer" className="flex-1">
              Sesión del closer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="caller">
            <div className="pt-4">
              <QASessionPanelComponent
                role="caller"
                items={callerItems}
                leadId={lead.id}
                editable={callerEditable}
              />
            </div>
          </TabsContent>

          <TabsContent value="closer">
            <div className="pt-4">
              <QASessionPanelComponent
                role="closer"
                items={closerItems}
                leadId={lead.id}
                editable={closerEditable}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Desktop: two-column grid ──────────────────────────────── */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Sesión del caller</Label>
          <QASessionPanelComponent
            role="caller"
            items={callerItems}
            leadId={lead.id}
            editable={callerEditable}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">Sesión del closer</Label>
          <QASessionPanelComponent
            role="closer"
            items={closerItems}
            leadId={lead.id}
            editable={closerEditable}
          />
        </div>
      </div>
    </>
  );
}
