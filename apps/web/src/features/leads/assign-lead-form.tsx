"use client";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { trpc } from "@/utils/trpc";
import { useTrpcMutationWithToast } from "@/lib/use-trpc-mutation-with-toast";
import { Input } from "@crm-fran/ui/components/input";
import { Textarea } from "@crm-fran/ui/components/textarea";
import { Skeleton } from "@crm-fran/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm-fran/ui/components/select";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
} from "@crm-fran/ui/components/field";

const formSchema = z.object({
  isContacted: z.string(),
  isDecisionMaker: z.string(),
  decisionMakerName: z.string(),
  financialSource: z.string(),
  productFit: z.string(),
  urgencyReason: z.string(),
  extraInfo: z.string(),
  closerId: z.string(),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
});

type FormValue = z.infer<typeof formSchema>;

const defaultValues = {
  isContacted: "",
  isDecisionMaker: "",
  decisionMakerName: "",
  financialSource: "",
  productFit: "",
  urgencyReason: "",
  extraInfo: "",
  closerId: "",
  scheduledDate: "",
  scheduledTime: "",
};

type FieldName = keyof typeof defaultValues;

const conditionalFieldNames: FieldName[] = [
  "isDecisionMaker",
  "decisionMakerName",
  "financialSource",
  "productFit",
  "urgencyReason",
  "extraInfo",
  "closerId",
  "scheduledDate",
  "scheduledTime",
];

interface AssignLeadFormProps {
  leadId: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export default function AssignLeadForm({
  leadId,
  onSuccess,
}: AssignLeadFormProps) {
  const [branch, setBranch] = useState<"" | "yes" | "no">("");
  const queryClient = useQueryClient();
  const mutation = useTrpcMutationWithToast(
    trpc.leads.assignLead.mutationOptions(),
    {
      success: "Lead asignado correctamente",
      error: "Error al asignar el lead",
    },
  );
  const closers = useQuery(trpc.users.listClosers.queryOptions());

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: ({ value }) => {
        const result = validateAssignLead(value as FormValue);
        return result;
      },
    },
    onSubmit: async ({ value }) => {
      const payload = buildPayload(leadId, value as FormValue);
      mutation.mutate(payload, {
        onSuccess: () => {
          onSuccess?.();
          queryClient.invalidateQueries({
            queryKey: trpc.leads.listByUserId.queryKey(),
          });
        },
      });
    },
  });

  const resetConditionalFields = () => {
    for (const name of conditionalFieldNames) {
      form.setFieldValue(name, "");
    }
  };

  const handleIsContactedChange = (value: string) => {
    setBranch(value as "yes" | "no" | "");
    if (value === "no" || value === "yes") {
      resetConditionalFields();
    }
  };

  return (
    <form
      className="mx-auto w-full max-w-lg"
      id="assign-lead-form"
      data-testid="assign-lead-form"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="isContacted">
          {(field) => (
            <Field invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor="isContacted">¿Fué contactado?</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => {
                  field.handleChange(value ?? "");
                  handleIsContactedChange(value ?? "");
                }}
              >
                <SelectTrigger
                  id="isContacted"
                  data-testid="isContacted-trigger"
                  className="h-11"
                >
                  <SelectValue placeholder="Seleccione una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
              <FieldError>
                {field.state.meta.errors
                  .map((error) => (typeof error === "string" ? error : ""))
                  .join(" ")}
              </FieldError>
            </Field>
          )}
        </form.Field>

        {branch === "yes" && (
          <>
            <form.Field name="isDecisionMaker">
              {(field) => (
                <Field invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="isDecisionMaker">
                    ¿Es el decisor?
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value ?? "")}
                  >
                    <SelectTrigger id="isDecisionMaker" className="h-11">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => (typeof error === "string" ? error : ""))
                      .join(" ")}
                  </FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field name="decisionMakerName">
              {(field) => (
                <Field invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="decisionMakerName">
                    Si respondió NO ¿quién es la persona correcta?
                  </FieldLabel>
                  <Input
                    id="decisionMakerName"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => (typeof error === "string" ? error : ""))
                      .join(" ")}
                  </FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field name="financialSource">
              {(field) => (
                <Field invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="financialSource">
                    ¿De dónde sale su capacidad económica?
                  </FieldLabel>
                  <Textarea
                    id="financialSource"
                    value={field.state.value}
                    className="min-h-28 resize-none"
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => (typeof error === "string" ? error : ""))
                      .join(" ")}
                  </FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field name="productFit">
              {(field) => (
                <Field invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="productFit">
                    Producto recomendado
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value ?? "")}
                  >
                    <SelectTrigger id="productFit">
                      <SelectValue placeholder="Seleccione un producto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Product 1">Product 1</SelectItem>
                      <SelectItem value="Product 2">Product 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => (typeof error === "string" ? error : ""))
                      .join(" ")}
                  </FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field name="urgencyReason">
              {(field) => (
                <Field invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="urgencyReason">
                    ¿De dónde sale la urgencia?
                  </FieldLabel>
                  <Textarea
                    id="urgencyReason"
                    value={field.state.value}
                    className="min-h-28 resize-none"
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => (typeof error === "string" ? error : ""))
                      .join(" ")}
                  </FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field name="extraInfo">
              {(field) => (
                <Field invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="extraInfo">Información extra</FieldLabel>
                  <Textarea
                    id="extraInfo"
                    value={field.state.value}
                    className="min-h-28 resize-none"
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => (typeof error === "string" ? error : ""))
                      .join(" ")}
                  </FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field name="closerId">
              {(field) => (
                <Field invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="closerId">Closer asignado</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value ?? "")}
                  >
                    <SelectTrigger id="closerId">
                      <SelectValue placeholder="Seleccione un closer" />
                    </SelectTrigger>
                    <SelectContent>
                      {closers.isLoading ? (
                        <Skeleton className="h-8 w-full" />
                      ) : closers.data && closers.data.length > 0 ? (
                        closers.data.map((closer) => (
                          <SelectItem key={closer.id} value={closer.id}>
                            {closer.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          Sin closers
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => (typeof error === "string" ? error : ""))
                      .join(" ")}
                  </FieldError>
                </Field>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="scheduledDate">
                {(field) => (
                  <Field invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="scheduledDate">Fecha</FieldLabel>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError>
                      {field.state.meta.errors
                        .map((error) =>
                          typeof error === "string" ? error : "",
                        )
                        .join(" ")}
                    </FieldError>
                  </Field>
                )}
              </form.Field>

              <form.Field name="scheduledTime">
                {(field) => (
                  <Field invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="scheduledTime">Hora</FieldLabel>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError>
                      {field.state.meta.errors
                        .map((error) =>
                          typeof error === "string" ? error : "",
                        )
                        .join(" ")}
                    </FieldError>
                  </Field>
                )}
              </form.Field>
            </div>
          </>
        )}
      </FieldGroup>
    </form>
  );
}

function validateAssignLead(value: FormValue) {
  const fieldErrors: Record<string, string[]> = {};

  if (value.isContacted !== "yes" && value.isContacted !== "no") {
    fieldErrors.isContacted = ["Seleccione una opción"];
  }

  if (value.isContacted === "yes") {
    if (value.isDecisionMaker === "") {
      fieldErrors.isDecisionMaker = ["Seleccione una opción"];
    }
    if (value.decisionMakerName.trim() === "") {
      fieldErrors.decisionMakerName = ["Requerido"];
    }
    if (value.financialSource.trim() === "") {
      fieldErrors.financialSource = ["Requerido"];
    }
    if (value.productFit.trim() === "") {
      fieldErrors.productFit = ["Requerido"];
    }
    if (value.urgencyReason.trim() === "") {
      fieldErrors.urgencyReason = ["Requerido"];
    }
    if (value.closerId === "") {
      fieldErrors.closerId = ["Seleccione un closer"];
    }
    if (value.scheduledDate === "") {
      fieldErrors.scheduledDate = ["Requerido"];
    }
    if (value.scheduledTime === "") {
      fieldErrors.scheduledTime = ["Requerido"];
    }
  }

  return Object.keys(fieldErrors).length > 0
    ? { fields: fieldErrors }
    : undefined;
}

function buildPayload(
  leadId: string,
  value: FormValue,
):
  | { leadId: string; isContacted: "no" }
  | {
      leadId: string;
      isContacted: "yes";
      closerId: string;
      questions: { questionKey: string; question: string; answer: string }[];
      scheduledDate: string;
      scheduledTime: string;
      extraNotes: string;
    } {
  if (value.isContacted === "no") {
    return { leadId, isContacted: "no" };
  }

  return {
    leadId,
    isContacted: "yes",
    closerId: value.closerId,
    questions: [
      {
        questionKey: "isContacted",
        question: "¿Fué contactado?",
        answer: "Sí",
      },
      {
        questionKey: "isDecisionMaker",
        question: "¿Es el decisor?",
        answer: value.isDecisionMaker === "yes" ? "Sí" : "No",
      },
      {
        questionKey: "decisionMakerName",
        question: "¿Quién es la persona correcta?",
        answer: value.decisionMakerName,
      },
      {
        questionKey: "financialSource",
        question: "¿De dónde sale su capacidad económica?",
        answer: value.financialSource,
      },
      {
        questionKey: "productFit",
        question: "Producto recomendado",
        answer: value.productFit,
      },
      {
        questionKey: "urgencyReason",
        question: "¿De dónde sale la urgencia?",
        answer: value.urgencyReason,
      },
      {
        questionKey: "extraInfo",
        question: "Información extra",
        answer: value.extraInfo,
      },
      {
        questionKey: "scheduledDate",
        question: "Fecha",
        answer: value.scheduledDate,
      },
      {
        questionKey: "scheduledTime",
        question: "Hora",
        answer: value.scheduledTime,
      },
    ],
    scheduledDate: value.scheduledDate,
    scheduledTime: value.scheduledTime,
    extraNotes: value.extraInfo,
  };
}
