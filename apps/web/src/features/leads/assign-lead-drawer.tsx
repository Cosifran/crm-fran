"use client";

import { useState } from "react";
import { UserRoundPlus } from "lucide-react";
import { Button } from "@crm-fran/ui/components/button";
import LeadDrawer from "@/components/lead-drawer/lead-drawer";
import AssignLeadForm from "./assign-lead-form";

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


export default function AssignLeadDrawer({
    lead,
}: AssignLeadDrawerProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button variant="outline" onClick={() => setOpen(true)}>
                <UserRoundPlus />
            </Button>

            <LeadDrawer
                open={open}
                onOpenChange={setOpen}
                title="Asignar lead"
                description="Completá la información para asignar este lead a un closer."
            >
                <AssignLeadForm
                    leadId={lead.id}
                    onCancel={() => setOpen(false)}
                    onSuccess={() => setOpen(false)}
                />
            </LeadDrawer>
        </>
    );
}