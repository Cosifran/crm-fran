"use client";
import { useState } from "react";
import { Eye } from "lucide-react";
import type { QASessionItem } from "@/app/types";
import { CALLER_QUESTIONS, CLOSER_QUESTIONS } from "./qa-questions";
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
import LeadDrawer from "@/components/lead-drawer/lead-drawer";

export interface LeadDetailsData {
  questions: QASessionItem[];
  feedback?: string;
}

const QUESTIONS_BY_ROLE = {
  caller: CALLER_QUESTIONS,
  closer: CLOSER_QUESTIONS,
} as const;

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

function buildAnswersMap(items: QASessionItem[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) {
    map[item.question] = item.answer;
  }
  return map;
}

export default function LeadViewDrawer({
  lead: lead,
}: {
  lead: LeadDetailsData;
}) {
  const [open, setOpen] = useState(false);

  const { caller: callerItems, closer: closerItems } = partitionQASession(
    lead.questions ?? [],
  );

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
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
          callerAnswers={callerItems}
          closerAnswers={closerItems}
        />
      </LeadDrawer>
    </>
  );
}

function ReadOnlyQAView({
  callerAnswers,
  closerAnswers,
}: {
  callerAnswers: QASessionItem[];
  closerAnswers: QASessionItem[];
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
                role="caller"
                items={callerAnswers}
                emptyMessage="Sin respuesta"
              />
            </div>
          </TabsContent>

          <TabsContent value="closer">
            <div className="pt-4">
              <ReadOnlySession
                role="closer"
                items={closerAnswers}
                emptyMessage="Sin respuesta"
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
            role="caller"
            items={callerAnswers}
            emptyMessage="Aún no se registraron respuestas del caller"
          />
        </div>

        <div className="flex flex-col gap-3">
          <Label className="text-base font-semibold">Sesión del closer</Label>
          <ReadOnlySession
            role="closer"
            items={closerAnswers}
            emptyMessage="Aún no se registraron respuestas del closer"
          />
        </div>
      </div>
    </>
  );
}

function ReadOnlySession({
  role,
  items,
  emptyMessage,
}: {
  role: "caller" | "closer";
  items: QASessionItem[];
  emptyMessage: string;
}) {
  const questions = QUESTIONS_BY_ROLE[role];
  const existingAnswers = buildAnswersMap(items);

  return (
    <div className="space-y-4">

      {questions.map((question) => {
        const answer = existingAnswers[question] ?? "";
        return (
          <div key={question} className="space-y-2">
            <span className="text-sm font-medium">{question}</span>
            {answer.length > 80 ? (
              <Textarea
                value={answer}
                disabled
                className="min-h-20 resize-none"
              />
            ) : answer ? (
              <Input value={answer} disabled />
            ) : (
              <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
