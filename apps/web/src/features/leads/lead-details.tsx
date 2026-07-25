import { Label } from "@crm-fran/ui/components/label";
import { Input } from "@crm-fran/ui/components/input";
import { Textarea } from "@crm-fran/ui/components/textarea";

interface Lead {
    id: string;
    name: string;
    email: string;
    phone: string;
    state: string;
    response: string;
    feedback: string;
    callerId: string | null;
    closerId: string | null;
    createdAt: string;
    updatedAt: string;

    decisionMaker?: string;
    decisionMakerName?: string;
    financialSource?: string;
    recommendedProduct?: string;
    urgency?: string;
    extraInfo?: string;
    closer?: string;
    appointmentDate?: string;
    appointmentTime?: string;
}

export default function LeadDetails({
    lead,
}: {
    lead: Lead;
}) {
    return (
        <div className="space-y-6">

            <div className="space-y-4">

                <div className="space-y-2">
                    <Label>¿Es el decisor?</Label>

                    <Input
                        value={lead.decisionMaker ?? ""}
                        disabled
                    />
                </div>

                <div className="space-y-2">
                    <Label>Persona correcta</Label>

                    <Input
                        value={lead.decisionMakerName ?? ""}
                        disabled
                    />
                </div>

                <div className="space-y-2">
                    <Label>Capacidad económica</Label>

                    <Textarea
                        value={lead.financialSource ?? ""}
                        disabled
                        className="min-h-28 resize-none"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Producto recomendado</Label>

                    <Input
                        value={lead.recommendedProduct ?? ""}
                        disabled
                    />
                </div>

                <div className="space-y-2">
                    <Label>Urgencia</Label>

                    <Textarea
                        value={lead.urgency ?? ""}
                        disabled
                        className="min-h-28 resize-none"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Información extra</Label>

                    <Textarea
                        value={lead.extraInfo ?? ""}
                        disabled
                        className="min-h-28 resize-none"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Closer asignado</Label>

                    <Input
                        value={lead.closer ?? ""}
                        disabled
                    />
                </div>

                <div className="space-y-2">
                    <Label>Fecha</Label>

                    <Input
                        value={lead.appointmentDate ?? ""}
                        disabled
                    />
                </div>

                <div className="space-y-2">
                    <Label>Hora</Label>

                    <Input
                        value={lead.appointmentTime ?? ""}
                        disabled
                    />
                </div>

            </div>
        </div>
    );
}