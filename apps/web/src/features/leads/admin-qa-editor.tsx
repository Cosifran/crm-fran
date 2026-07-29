"use client";

import { useState } from "react";

import { Input } from "@crm-fran/ui/components/input";
import { Textarea } from "@crm-fran/ui/components/textarea";
import { Button } from "@crm-fran/ui/components/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@crm-fran/ui/components/tabs";
import {
  FieldGroup,
  Field,
  FieldLabel,
} from "@crm-fran/ui/components/field";

import { CALLER_QUESTIONS, CLOSER_QUESTIONS } from "./qa-questions";

type Answers = Record<string, string>;

interface AdminQAEditorProps {
  initialCallerAnswers?: Answers;
  initialCloserAnswers?: Answers;
}

// Fase 1: UI estático. Sin mutación, sin tRPC. Solo tabs con los dos
// formularios pre-rellenados. Cada form es local con useState.
export default function AdminQAEditor({
  initialCallerAnswers = {},
  initialCloserAnswers = {},
}: AdminQAEditorProps) {
  return (
    <Tabs defaultValue="caller" className="w-full">
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
          <SessionForm
            formId="admin-caller-form"
            testId="admin-caller-form"
            questions={CALLER_QUESTIONS}
            initialAnswers={initialCallerAnswers}
            isEditing={true}
          />
        </div>
      </TabsContent>

      <TabsContent value="closer">
        <div className="pt-4">
          <SessionForm
            formId="admin-closer-form"
            testId="admin-closer-form"
            questions={CLOSER_QUESTIONS}
            initialAnswers={initialCloserAnswers}
            isEditing={true}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}

interface SessionFormProps {
  formId: string;
  testId: string;
  questions: readonly string[];
  initialAnswers: Answers;
  isEditing: boolean;
}

function SessionForm({
  formId,
  testId,
  questions,
  initialAnswers,
  isEditing,
}: SessionFormProps) {
  const [values, setValues] = useState<Answers>(() => {
    const seeded: Answers = {};
    for (const question of questions) {
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

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-lg"
      id={formId}
      data-testid={testId}
    >
      <FieldGroup>
        {isEditing && (
          <p className="text-muted-foreground text-sm">
            Estás editando tus respuestas.
          </p>
        )}

        {questions.map((question) => {
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

        <Button type="submit">Editar</Button>
      </FieldGroup>
    </form>
  );
}
