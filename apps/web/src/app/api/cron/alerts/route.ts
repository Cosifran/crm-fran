import { NextRequest, NextResponse } from "next/server";
import { processRecurringAlerts } from "@crm-fran/api";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (authorization !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processRecurringAlerts();
    return NextResponse.json({ processed });
  } catch (error) {
    console.error("[cron/alerts] failed to process recurring alerts", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
