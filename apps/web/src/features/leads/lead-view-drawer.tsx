"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@crm-fran/ui/components/button";
import { Input } from "@crm-fran/ui/components/input";
import { Textarea } from "@crm-fran/ui/components/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@crm-fran/ui/components/tabs";
import { Label } from "@crm-fran/ui/components/label";
import {
  FieldGroup,
  Field,
  FieldLabel,
} from "@crm-fran/ui/components/field";

import LeadDrawer from "@/components/lead-drawer/lead-drawer";
import { CALLER_QUESTIONS, CLOSER_QUESTIONS } from "./qa-questions";

// ── Types ────────────────────────────────────────────────────────────────────

export interface LeadDrawerData {
    id: string;
    name: string;
    email: string;
    phone: string;
    state: string;
    caller: { id: string; name: string; email: string } | null;
    closer: { id: string; name: string; email: string } | null;
}

// ── Mock data (fase 1) ───────────────────────────────────────────────────────
// TODO phase 2: replace with trpc.leads.getById
const MOCK_LEAD: LeadDrawerData = {
    id: "lead-mock",
    name: "Lead mock",
    email: "mock@example.com",
    phone: "+54 11 5555 5555",
    state: "Nuevo",
    caller: { id: "u-caller", name: "Caller mock", email: "caller@example.com" },
    closer: { id: "u-closer", name: "Closer mock", email: "closer@example.com" },
};

const MOCK_CALLER_ANSWERS: Record<string, string> = CALLER_QUESTIONS.reduce(
    (acc, question, index) => {
        acc[question] = index === 0 ? "Sí" : `Respuesta caller #${index}`;
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

// ── Component ────────────────────────────────────────────────────────────────

export default function LeadViewDrawer({
    lead: _lead,
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
                type="view"
            >
                <ReadOnlyQAView
                    callerAnswers={MOCK_CALLER_ANSWERS}
                    closerAnswers={MOCK_CLOSER_ANSWERS}
                />
            </LeadDrawer>
        </>
    );
}

// ── Read-only inline view ────────────────────────────────────────────────────
// Fase 1: 100% read-only para todos los roles. Sin inputs editables,
// sin submit, sin botones que abran otros drawers.

function ReadOnlyQAView({
    callerAnswers,
    closerAnswers,
}: {
    callerAnswers: Record<string, string>;
    closerAnswers: Record<string, string>;
}) {
    return (
        <>
            {/* Mobile: tabs */}
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
                            <ReadOnlySession
                                questions={CALLER_QUESTIONS}
                                answers={callerAnswers}
                                emptyMessage="Aún no se registraron respuestas del caller"
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="closer">
                        <div className="pt-4">
                            <ReadOnlySession
                                questions={CLOSER_QUESTIONS}
                                answers={closerAnswers}
                                emptyMessage="Aún no se registraron respuestas del closer"
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Desktop: two-column grid */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-6">
                <div className="flex flex-col gap-3">
                    <Label className="text-base font-semibold">Sesión del caller</Label>
                    <ReadOnlySession
                        questions={CALLER_QUESTIONS}
                        answers={callerAnswers}
                        emptyMessage="Aún no se registraron respuestas del caller"
                    />
                </div>

                <div className="flex flex-col gap-3">
                    <Label className="text-base font-semibold">Sesión del closer</Label>
                    <ReadOnlySession
                        questions={CLOSER_QUESTIONS}
                        answers={closerAnswers}
                        emptyMessage="Aún no se registraron respuestas del closer"
                    />
                </div>
            </div>
        </>
    );
}

function ReadOnlySession({
    questions,
    answers,
    emptyMessage,
}: {
    questions: readonly string[];
    answers: Record<string, string>;
    emptyMessage: string;
}) {
    const hasAnyAnswer = questions.some(
        (question) => (answers[question] ?? "").trim() !== "",
    );

    if (!hasAnyAnswer) {
        return (
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        );
    }

    return (
        <FieldGroup>
            {questions.map((question) => {
                const answer = answers[question] ?? "";
                if (answer.trim() === "") {
                    return null;
                }
                const isLongText =
                    question.includes("económica") ||
                    question.includes("urgencia") ||
                    question.includes("extra");

                return (
                    <Field key={question}>
                        <FieldLabel>{question}</FieldLabel>
                        {isLongText ? (
                            <Textarea
                                value={answer}
                                disabled
                                className="min-h-20 resize-none"
                            />
                        ) : (
                            <Input value={answer} disabled />
                        )}
                    </Field>
                );
            })}
        </FieldGroup>
    );
}
