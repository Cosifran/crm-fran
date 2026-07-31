"use client";

import { useState } from "react";

import { Input } from "@crm-fran/ui/components/input";
import { Textarea } from "@crm-fran/ui/components/textarea";
import { Button } from "@crm-fran/ui/components/button";
import { Empty } from "@crm-fran/ui/components/empty";
import {
  FieldGroup,
  Field,
  FieldLabel,
} from "@crm-fran/ui/components/field";

import { trpc } from "@/utils/trpc";
import { useTrpcMutationWithToast } from "@/lib/use-trpc-mutation-with-toast";

import { CALLER_QUESTIONS, CLOSER_QUESTIONS } from "./qa-questions";

// ── Types ────────────────────────────────────────────────────────────────────

interface QASessionItem {
  question: string;
  answer: string;
  authorRole: "caller" | "closer";
  authorId: string | null;
}

interface QASessionPanelProps {
  role: "caller" | "closer";
  items: QASessionItem[];
  leadId: string;
  editable: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const QUESTIONS_BY_ROLE = {
  caller: CALLER_QUESTIONS,
  closer: CLOSER_QUESTIONS,
} as const;

type QASessionPanelFormValue = Record<string, string>;

function buildAnswersMap(
  items: QASessionItem[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) {
    map[item.question] = item.answer;
  }
  return map;
}

function buildEditableDefaultValues(
  questions: readonly string[],
  existingAnswers: Record<string, string>,
): QASessionPanelFormValue {
  const values: QASessionPanelFormValue = {};
  for (const q of questions) {
    values[q] = existingAnswers[q] ?? "";
  }
  return values;
}

// ── Panel Component ──────────────────────────────────────────────────────────

export default function QASessionPanel({
  role,
  items,
  leadId,
  editable,
}: QASessionPanelProps) {
  const questions = QUESTIONS_BY_ROLE[role];
  const existingAnswers = buildAnswersMap(items);
  const hasContent = items.length > 0;

  return (
    <FieldGroup>
      {!hasContent && !editable && (
        <Empty
          heading="Sin respuestas del caller"
          description="Aún no se registraron respuestas"
        />
      )}

      {!hasContent && editable && (
        <EditableForm
          leadId={leadId}
          questions={questions}
          existingAnswers={existingAnswers}
        />
      )}

      {hasContent && !editable && (
        <ReadOnlyView questions={questions} existingAnswers={existingAnswers} />
      )}

      {hasContent && editable && (
        <EditableForm
          leadId={leadId}
          questions={questions}
          existingAnswers={existingAnswers}
        />
      )}
    </FieldGroup>
  );
}

// ── Read-Only View ───────────────────────────────────────────────────────────

function ReadOnlyView({
  questions,
  existingAnswers,
}: {
  questions: readonly string[];
  existingAnswers: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      {questions.map((question) => {
        const answer = existingAnswers[question] ?? "";
        return (
          <div key={question} className="space-y-2">
            <span className="text-sm font-medium">{question}</span>
            {answer.length > 80 ? (
              <Textarea value={answer} disabled className="min-h-20 resize-none" />
            ) : (
              <Input value={answer} disabled />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Editable Form ────────────────────────────────────────────────────────────

function EditableForm({
  leadId,
  questions,
  existingAnswers,
}: {
  leadId: string;
  questions: readonly string[];
  existingAnswers: Record<string, string>;
}) {
  const [values, setValues] = useState<QASessionPanelFormValue>(
    () => buildEditableDefaultValues(questions, existingAnswers),
  );

  const mutation = useTrpcMutationWithToast(
    trpc.leads.recordCloserAnswers.mutationOptions(),
    {
      success: "Respuestas guardadas correctamente",
      error: "Error al guardar las respuestas",
    },
  );

  const handleChange = (question: string, answer: string) => {
    setValues((prev) => ({ ...prev, [question]: answer }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items = questions.map((question) => ({
      question,
      answer: values[question] ?? "",
    }));
    mutation.mutate({ leadId, items });
  };

  const hasAnyAnswer = Object.values(values).some((v) => v.trim() !== "");
  const submitLabel = hasAnyAnswer ? "Actualizar respuestas" : "Guardar respuestas";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {questions.map((question) => {
        const answer = values[question] ?? "";
        const isLongText = question.includes("económica") || question.includes("urgencia") || question.includes("extra");

        return (
          <Field key={question}>
            <FieldLabel>{question}</FieldLabel>
            {isLongText ? (
              <Textarea
                value={answer}
                onChange={(e) => handleChange(question, e.target.value)}
                className="min-h-20 resize-none"
              />
            ) : (
              <Input
                value={answer}
                onChange={(e) => handleChange(question, e.target.value)}
              />
            )}
          </Field>
        );
      })}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
