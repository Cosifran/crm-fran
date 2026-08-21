import type { Permission } from "@crm-fran/db/schema/auth";
import { z } from "zod";

import { hasPermission } from "./permissions";

export const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe-2025-12-15";
export const SUMMARY_MODEL = "gpt-4o-mini-2024-07-18";
export const PRICING_VERSION = "openai-2026-08-20";
export const MONTHLY_REFERENCE_MINUTES = 5_000;

const nullableFormText = z.string().max(2_000);
const transcriptText = z.string().max(100_000);

export const callFeedbackDraftSchema = z
  .object({
    isContacted: z.enum(["", "Si", "No"]),
    outcome: z.enum([
      "",
      "future_call",
      "not_fit",
      "not_interested",
      "appointment",
    ]),
    isDecisionMaker: z.enum(["", "Si", "No"]),
    decisionMakerName: nullableFormText,
    financialSource: nullableFormText,
    trainingAndPriceAwareness: nullableFormText,
    urgencyReason: nullableFormText,
    summary: nullableFormText,
    extraInfo: transcriptText,
    scheduledDate: z.union([z.literal(""), z.string().date()]),
    scheduledTime: z.union([
      z.literal(""),
      z.string().regex(/^\d{2}:\d{2}$/),
    ]),
    alertSeverity: z.enum(["", "urgent", "warning", "info"]),
  })
  .strict();

export type CallFeedbackDraft = z.infer<typeof callFeedbackDraftSchema>;

type CostEstimateInput = {
  durationMs: number;
  summaryInputTokens: number;
  summaryOutputTokens: number;
};

export function estimateCallFeedbackCostMicroUsd({
  durationMs,
  summaryInputTokens,
  summaryOutputTokens,
}: CostEstimateInput): number {
  const transcription = (durationMs / 60_000) * 3_000;
  const summaryInput = summaryInputTokens * 0.15;
  const summaryOutput = summaryOutputTokens * 0.6;
  return Math.round(transcription + summaryInput + summaryOutput);
}

export function canProcessLeadRecording({
  permissions,
  userId,
  callerId,
}: {
  permissions: Permission[];
  userId: string;
  callerId: string | null;
}): boolean {
  return permissions.includes("*") || callerId === userId;
}

const structuredDraftSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    isContacted: { type: "string", enum: ["", "Si", "No"] },
    outcome: {
      type: "string",
      enum: ["", "future_call", "not_fit", "not_interested", "appointment"],
    },
    isDecisionMaker: { type: "string", enum: ["", "Si", "No"] },
    decisionMakerName: { type: "string" },
    financialSource: { type: "string" },
    trainingAndPriceAwareness: { type: "string" },
    urgencyReason: { type: "string" },
    summary: { type: "string" },
    scheduledDate: { type: "string" },
    scheduledTime: { type: "string" },
    alertSeverity: {
      type: "string",
      enum: ["", "urgent", "warning", "info"],
    },
  },
  required: [
    "isContacted",
    "outcome",
    "isDecisionMaker",
    "decisionMakerName",
    "financialSource",
    "trainingAndPriceAwareness",
    "urgencyReason",
    "summary",
    "scheduledDate",
    "scheduledTime",
    "alertSeverity",
  ],
} as const;

export class CallFeedbackAccessError extends Error {}
export class CallFeedbackLeadNotFoundError extends Error {}

export type CallFeedbackUsageRecord = {
  userId: string;
  leadId: string;
  processedDurationMs: number;
  transcriptionModel: string;
  summaryModel: string;
  estimatedCostMicroUsd: number;
  pricingVersion: string;
};

export type CallFeedbackDependencies = {
  findLead: (leadId: string) => Promise<{ id: string; callerId: string | null } | undefined>;
  transcribe: (audio: File) => Promise<string>;
  summarize: (transcript: string) => Promise<{
    outputText: string;
    inputTokens: number;
    outputTokens: number;
  }>;
  recordUsage: (usage: CallFeedbackUsageRecord) => Promise<void>;
};

export async function processCallRecording({
  audio,
  durationMs,
  leadId,
  userId,
  permissions,
  dependencies,
}: {
  audio: File;
  durationMs: number;
  leadId: string;
  userId: string;
  permissions: Permission[];
  dependencies: CallFeedbackDependencies;
}) {
  if (!hasPermission(permissions, ["leads:write"])) {
    throw new CallFeedbackAccessError("Permission denied");
  }

  const lead = await dependencies.findLead(leadId);

  if (!lead) {
    throw new CallFeedbackLeadNotFoundError("Lead not found");
  }
  if (!canProcessLeadRecording({ permissions, userId, callerId: lead.callerId })) {
    throw new CallFeedbackAccessError("Lead is not assigned to this caller");
  }

  const transcript = await dependencies.transcribe(audio);
  const response = await dependencies.summarize(transcript);
  const draft = callFeedbackDraftSchema.parse({
    ...JSON.parse(response.outputText),
    extraInfo: transcript,
  });
  const estimatedCostMicroUsd = estimateCallFeedbackCostMicroUsd({
    durationMs,
    summaryInputTokens: response.inputTokens,
    summaryOutputTokens: response.outputTokens,
  });

  await dependencies.recordUsage({
    userId,
    leadId,
    processedDurationMs: durationMs,
    transcriptionModel: TRANSCRIPTION_MODEL,
    summaryModel: SUMMARY_MODEL,
    estimatedCostMicroUsd,
    pricingVersion: PRICING_VERSION,
  });

  return {
    draft,
    usage: { durationMs, estimatedCostMicroUsd },
  };
}

export { structuredDraftSchema };
