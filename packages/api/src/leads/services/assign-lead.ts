import { TRPCError } from "@trpc/server";

export async function assignLead({
  input,
  callerId,
}: {
  input: { leadId: string; isContacted: "yes" | "no" };
  callerId: string;
}) {
  void input;
  void callerId;
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "assignLead not implemented",
  });
}
