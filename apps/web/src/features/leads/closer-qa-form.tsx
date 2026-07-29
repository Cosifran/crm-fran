"use client";

import { useState } from "react";

import { Input } from "@crm-fran/ui/components/input";
import { Textarea } from "@crm-fran/ui/components/textarea";
import { Button } from "@crm-fran/ui/components/button";
import {
  FieldGroup,
  Field,
  FieldLabel,
} from "@crm-fran/ui/components/field";

import { CLOSER_QUESTIONS } from "./qa-questions";

type Answers = Record<string, string>;

interface CloserQAFormProps {
  initialAnswers?: Answers;
  isEditing?: boolean;
}

// Fase 1: UI estático. Sin mutación, sin tRPC, sin react-hook-form.
// El botón submit es no-op. El padre (assign-lead-drawer) decide si
// pre-rellenar y qué label mostrar.
export default function CloserQAForm({
  initialAnswers = {},
  isEditing = false,
}: CloserQAFormProps) {
  const [values, setValues] = useState<Answers>(() => {
    const seeded: Answers = {};
    for (const question of CLOSER_QUESTIONS) {
      seeded[question] = initialAnswers[question] ?? "";
    }
    return seeded;
  });

  const handleChange = (question: string, value: string) => {
    setValues((prev) => ({ ...prev, [question]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const hasAnyAnswer = Object.values(values).some((v) => v.trim() !== "");
  const submitLabel = hasAnyAnswer
    ? isEditing
      ? "Editar"
      : "Guardar"
    : "Guardar";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-lg"
      id="closer-qa-form"
      data-testid="closer-qa-form"
    >
      <FieldGroup>
        {isEditing && (
          <p className="text-muted-foreground text-sm">
            Estás editando tus respuestas.
          </p>
        )}

        {CLOSER_QUESTIONS.map((question) => {
          const answer = values[question] ?? "";
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

        <Button type="submit">{submitLabel}</Button>
      </FieldGroup>
    </form>
  );
}
