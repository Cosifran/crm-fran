export type AgendaQuestion = {
  questionKey?: string;
  question?: string;
  answer: string;
  authorRole: "caller" | "closer";
  authorId?: string | null;
};

export type AgendaLeadInput = {
  id: string;
  name: string;
  phone?: string;
  feedback?: string;
  caller: { id: string; name: string } | null;
  closer: { id: string; name: string } | null;
  questions: readonly AgendaQuestion[];
};

export type AgendaLead = AgendaLeadInput & {
  scheduledDate: string;
  scheduledTime: string;
};

export function getLatestCallerQuestionAnswer(
  questions: readonly AgendaQuestion[],
  questionKey: string,
): string | undefined {
  for (let index = questions.length - 1; index >= 0; index -= 1) {
    const question = questions[index];
    if (
      question?.authorRole === "caller" &&
      question.questionKey === questionKey
    ) {
      return question.answer;
    }
  }

  return undefined;
}

export function getLatestAgendaQuestionAnswer(
  questions: readonly AgendaQuestion[],
  questionKey: string,
): string | undefined {
  for (let index = questions.length - 1; index >= 0; index -= 1) {
    const question = questions[index];
    if (question?.questionKey === questionKey) return question.answer;
  }

  return undefined;
}

export function filterAgendaLeads(
  leads: readonly AgendaLeadInput[],
): AgendaLead[] {
  return leads.flatMap((lead) => {
    const outcome = getLatestCallerQuestionAnswer(
      lead.questions,
      "callerOutcome",
    );
    if (outcome !== "Agenda") return [];

    return [
      {
        ...lead,
        scheduledDate:
          getLatestAgendaQuestionAnswer(lead.questions, "scheduledDate") ??
          "Sin asignar",
        scheduledTime:
          getLatestAgendaQuestionAnswer(lead.questions, "scheduledTime") ??
          "Sin asignar",
      },
    ];
  });
}
