"use client";

import { useState } from "react";
import { Button } from "@crm-fran/ui/components/button";
import { Eye } from "lucide-react";

import LeadDrawer from "@/components/lead-drawer/lead-drawer";
import LeadDetails, { type LeadDetailsData } from "./lead-details";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Full lead shape returned by the tRPC `listByUserId` query.
 * Only `LeadDetailsData`-compatible fields are required; extra fields
 * from the API (name, email, caller, closer, etc.) are accepted but
 * not consumed by the drawer.
 */
export type LeadDrawerData = LeadDetailsData & {
  name: string;
  email: string;
  phone: string;
  state: string;
  caller: { id: string; name: string; email: string } | null;
  closer: { id: string; name: string; email: string } | null;
};

// ── Component ────────────────────────────────────────────────────────────────

export default function LeadViewDrawer({
    lead,
}: {
    lead: LeadDrawerData;
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                variant="outline"
                size="icon"
                onClick={() => setOpen(true)}
            >
                <Eye className="size-4" />
            </Button>

            <LeadDrawer
                open={open}
                onOpenChange={setOpen}
                title="Información del lead"
                description="Datos registrados durante la llamada."
            >
                <LeadDetails lead={lead} />
            </LeadDrawer>
        </>
    );
}