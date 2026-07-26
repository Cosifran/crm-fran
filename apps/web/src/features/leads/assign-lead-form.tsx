"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { Input } from "@crm-fran/ui/components/input";
import { Label } from "@crm-fran/ui/components/label";
import { Textarea } from "@crm-fran/ui/components/textarea";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@crm-fran/ui/components/select";

const schema = z.object({
    isContacted: z.string().min(1, "Seleccione una opción"),
    isDecisionMaker: z.string().min(1, "Seleccione una opción"),
    decisionMakerName: z.string(),
    financialSource: z.string().min(1, "Campo obligatorio"),
    productFit: z.string().min(1, "Seleccione un producto"),
    urgencyReason: z.string().min(1, "Campo obligatorio"),
    extraInfo: z.string(),
    closerId: z.string().min(1, "Seleccione un closer"),
    scheduledDate: z.string().min(1, "Seleccione una fecha"),
    scheduledTime: z.string().min(1, "Seleccione una hora"),
});

interface AssignLeadFormProps {
    leadId: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}

export default function AssignLeadForm({
    leadId,
    onSuccess,
}: AssignLeadFormProps) {
    const form = useForm({
        defaultValues: {
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
        },

        validators: {
            onSubmit: schema,
        },

        onSubmit: async ({ value }) => {
            console.log({
                leadId,
                ...value,
            });

            onSuccess?.();
        },
    });

    return (
      <form
        className="mx-auto w-full max-w-lg space-y-7"
        id="assign-lead-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <form.Field name="isContacted">
          {(field) => (
            <div className="space-y-2">
              <Label>¿Fué contactado?</Label>

              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccione una opción" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>

              {field.state.meta.errors.map((error) => (
                <p
                  key={error?.message}
                  className="mt-1 text-xs text-destructive"
                >
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="isDecisionMaker">
          {(field) => (
            <div className="space-y-2">
              <Label>¿Es el decisor?</Label>

              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccione una opción" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>

              {field.state.meta.errors.map((error) => (
                <p
                  key={error?.message}
                  className="mt-1 text-xs text-destructive"
                >
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="decisionMakerName">
          {(field) => (
            <div className="space-y-2">
              <Label>Si respondió NO ¿quién es la persona correcta?</Label>

              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />

              {field.state.meta.errors.map((error) => (
                <p
                  key={error?.message}
                  className="mt-1 text-xs text-destructive"
                >
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="financialSource">
          {(field) => (
            <div className="space-y-2">
              <Label>¿De dónde sale su capacidad económica?</Label>

              <Textarea
                value={field.state.value}
                className="min-h-28 resize-none"
                onChange={(e) => field.handleChange(e.target.value)}
              />

              {field.state.meta.errors.map((error) => (
                <p
                  key={error?.message}
                  className="mt-1 text-xs text-destructive"
                >
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="productFit">
          {(field) => (
            <div className="space-y-2">
              <Label>Producto recomendado</Label>

              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un producto" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Product 1">Product 1</SelectItem>
                  <SelectItem value="Product 2">Product 2</SelectItem>
                </SelectContent>
              </Select>

              {field.state.meta.errors.map((error) => (
                <p
                  key={error?.message}
                  className="mt-1 text-xs text-destructive"
                >
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="urgencyReason">
          {(field) => (
            <div className="space-y-2">
              <Label>¿De dónde sale la urgencia?</Label>

              <Textarea
                value={field.state.value}
                className="min-h-28 resize-none"
                onChange={(e) => field.handleChange(e.target.value)}
              />

              {field.state.meta.errors.map((error) => (
                <p
                  key={error?.message}
                  className="mt-1 text-xs text-destructive"
                >
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="extraInfo">
          {(field) => (
            <div className="space-y-2">
              <Label>Información extra</Label>

              <Textarea
                value={field.state.value}
                className="min-h-28 resize-none"
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="closerId">
          {(field) => (
            <div className="space-y-2">
              <Label>Closer asignado</Label>

              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un closer" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Juan Pérez">Juan Pérez</SelectItem>
                  <SelectItem value="María López">María López</SelectItem>
                </SelectContent>
              </Select>

              {field.state.meta.errors.map((error) => (
                <p
                  key={error?.message}
                  className="mt-1 text-xs text-destructive"
                >
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="scheduledDate">
            {(field) => (
              <div className="space-y-2">
                <Label>Fecha</Label>

                <Input
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />

                {field.state.meta.errors.map((error) => (
                  <p
                    key={error?.message}
                    className="mt-1 text-xs text-destructive"
                  >
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="scheduledTime">
            {(field) => (
              <div className="space-y-2">
                <Label>Hora</Label>

                <Input
                  type="time"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />

                {field.state.meta.errors.map((error) => (
                  <p
                    key={error?.message}
                    className="mt-1 text-xs text-destructive"
                  >
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>
      </form>
    );
}