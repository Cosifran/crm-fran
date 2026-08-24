export type ProfitabilitySpendPeriod = {
  id: string;
  source: string;
  campaign: string;
  periodStart: Date;
  periodEnd: Date;
  spendCents: number;
  referenceSaleValueCents: number;
};

export type ProfitabilityLead = {
  id: string;
  profile: string | null;
  source: string | null;
  campaign: string | null;
  createdAt: Date;
  callerId: string | null;
  callerName: string | null;
  closerId: string | null;
  closerName: string | null;
  contacted: boolean;
  appointment: boolean;
  show: boolean;
  sale: boolean;
};

type SuggestionAction = "increase" | "maintain" | "reduce" | "wait";

type Totals = {
  spendCents: number;
  estimatedRevenueCents: number;
  leads: number;
  contacted: number;
  appointments: number;
  shows: number;
  sales: number;
};

type Metrics = Totals & {
  estimatedContributionCents: number;
  costPerLeadCents: number | null;
  customerAcquisitionCostCents: number | null;
  roas: number | null;
  leadToSaleRate: number;
};

type AttributedLead = ProfitabilityLead & {
  allocatedSpendCents: number;
  estimatedRevenueCents: number;
};

const round = (value: number) => Math.round(value * 100) / 100;
const cents = (value: number) => Math.round(value);

function emptyTotals(): Totals {
  return {
    spendCents: 0,
    estimatedRevenueCents: 0,
    leads: 0,
    contacted: 0,
    appointments: 0,
    shows: 0,
    sales: 0,
  };
}

function addLead(totals: Totals, lead: AttributedLead) {
  totals.spendCents += lead.allocatedSpendCents;
  totals.estimatedRevenueCents += lead.estimatedRevenueCents;
  totals.leads += 1;
  totals.contacted += Number(lead.contacted);
  totals.appointments += Number(lead.appointment);
  totals.shows += Number(lead.show);
  totals.sales += Number(lead.sale);
}

function metrics(totals: Totals): Metrics {
  return {
    ...totals,
    spendCents: cents(totals.spendCents),
    estimatedRevenueCents: cents(totals.estimatedRevenueCents),
    estimatedContributionCents: cents(
      totals.estimatedRevenueCents - totals.spendCents,
    ),
    costPerLeadCents:
      totals.leads === 0 ? null : cents(totals.spendCents / totals.leads),
    customerAcquisitionCostCents:
      totals.sales === 0 ? null : cents(totals.spendCents / totals.sales),
    roas:
      totals.spendCents === 0
        ? null
        : round(totals.estimatedRevenueCents / totals.spendCents),
    leadToSaleRate:
      totals.leads === 0 ? 0 : round(totals.sales / totals.leads),
  };
}

function suggestion(row: Metrics): {
  action: SuggestionAction;
  suggestedBudgetChangePercent: number;
  reasons: string[];
} {
  if (row.leads < 30) {
    return {
      action: "wait",
      suggestedBudgetChangePercent: 0,
      reasons: [
        `Solo hay ${row.leads} leads atribuidos; se recomiendan al menos 30 antes de mover presupuesto.`,
      ],
    };
  }
  if ((row.roas ?? 0) < 1) {
    return {
      action: "reduce",
      suggestedBudgetChangePercent: -20,
      reasons: [
        `El ROAS estimado es ${row.roas ?? 0}; el ingreso atribuido no cubre el gasto publicitario.`,
      ],
    };
  }
  if ((row.roas ?? 0) >= 1.5 && row.sales >= 3) {
    return {
      action: "increase",
      suggestedBudgetChangePercent: 15,
      reasons: [
        `El ROAS estimado es ${row.roas} con ${row.sales} ventas; se sugiere probar un incremento limitado.`,
      ],
    };
  }
  return {
    action: "maintain",
    suggestedBudgetChangePercent: 0,
    reasons: [
      "La campaña cubre el gasto, pero todavía no ofrece margen estadístico suficiente para escalar.",
    ],
  };
}

function groupedRows(
  leads: readonly AttributedLead[],
  keyFor: (lead: AttributedLead) => { id: string; name: string } | null,
) {
  const grouped = new Map<string, { id: string; name: string; totals: Totals }>();
  for (const lead of leads) {
    const key = keyFor(lead);
    if (!key) continue;
    const current = grouped.get(key.id) ?? {
      ...key,
      totals: emptyTotals(),
    };
    addLead(current.totals, lead);
    grouped.set(key.id, current);
  }
  return [...grouped.values()]
    .map(({ totals, ...identity }) => ({ ...identity, ...metrics(totals) }))
    .sort(
      (left, right) =>
        right.estimatedContributionCents - left.estimatedContributionCents ||
        left.name.localeCompare(right.name),
    );
}

export function buildProfitabilityAnalysis(input: {
  from: Date;
  to: Date;
  spendPeriods: readonly ProfitabilitySpendPeriod[];
  leads: readonly ProfitabilityLead[];
}) {
  const attributed: AttributedLead[] = [];
  const campaignTotals = new Map<
    string,
    { source: string; campaign: string; totals: Totals }
  >();

  for (const period of input.spendPeriods) {
    const leads = input.leads.filter(
      (lead) =>
        lead.source === period.source &&
        lead.campaign === period.campaign &&
        lead.createdAt >= period.periodStart &&
        lead.createdAt <= period.periodEnd &&
        lead.createdAt >= input.from &&
        lead.createdAt <= input.to,
    );
    const allocatedSpend = leads.length === 0 ? 0 : period.spendCents / leads.length;
    const campaignKey = `${period.source}\u0000${period.campaign}`;
    const campaign = campaignTotals.get(campaignKey) ?? {
      source: period.source,
      campaign: period.campaign,
      totals: emptyTotals(),
    };

    campaign.totals.spendCents += period.spendCents;
    for (const lead of leads) {
      const row: AttributedLead = {
        ...lead,
        allocatedSpendCents: allocatedSpend,
        estimatedRevenueCents: lead.sale
          ? period.referenceSaleValueCents
          : 0,
      };
      attributed.push(row);
      addLead(campaign.totals, row);
      campaign.totals.spendCents -= allocatedSpend;
    }
    campaignTotals.set(campaignKey, campaign);
  }

  const campaigns = [...campaignTotals.values()]
    .map(({ totals, ...identity }) => {
      const row = metrics(totals);
      return { ...identity, ...row, suggestion: suggestion(row) };
    })
    .sort(
      (left, right) =>
        right.estimatedContributionCents - left.estimatedContributionCents ||
        left.campaign.localeCompare(right.campaign),
    );

  const summaryTotals = campaigns.reduce<Totals>(
    (total, campaign) => ({
      spendCents: total.spendCents + campaign.spendCents,
      estimatedRevenueCents:
        total.estimatedRevenueCents + campaign.estimatedRevenueCents,
      leads: total.leads + campaign.leads,
      contacted: total.contacted + campaign.contacted,
      appointments: total.appointments + campaign.appointments,
      shows: total.shows + campaign.shows,
      sales: total.sales + campaign.sales,
    }),
    emptyTotals(),
  );

  return {
    summary: metrics(summaryTotals),
    campaigns,
    profiles: groupedRows(attributed, (lead) => ({
      id: lead.profile ?? "sin-perfil",
      name: lead.profile ?? "Sin perfil",
    })),
    callers: groupedRows(attributed, (lead) =>
      lead.callerId
        ? { id: lead.callerId, name: lead.callerName ?? lead.callerId }
        : null,
    ),
    closers: groupedRows(attributed, (lead) =>
      lead.closerId
        ? { id: lead.closerId, name: lead.closerName ?? lead.closerId }
        : null,
    ),
    simulationOnly: true as const,
    methodology:
      "Atribución por cohorte: el gasto se reparte entre los leads creados en el periodo y el ingreso se estima con el valor manual por venta. No modifica campañas ni demuestra causalidad.",
  };
}

export function hasOverlappingSpendPeriod(input: {
  existing: readonly Pick<
    ProfitabilitySpendPeriod,
    "id" | "source" | "campaign" | "periodStart" | "periodEnd"
  >[];
  source: string;
  campaign: string;
  periodStart: Date;
  periodEnd: Date;
  excludeId?: string;
}) {
  return input.existing.some(
    (period) =>
      period.id !== input.excludeId &&
      period.source === input.source &&
      period.campaign === input.campaign &&
      period.periodStart <= input.periodEnd &&
      period.periodEnd >= input.periodStart,
  );
}
