"use client";

import { useState } from "react";
import { Button } from "@crm-fran/ui/components/button";
import { Eye } from "lucide-react";

import LeadDrawer from "@/components/lead-drawer/lead-drawer";
import LeadDetails from "./lead-details";

export default function LeadViewDrawer({
    lead,
}: {
    lead: any;
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