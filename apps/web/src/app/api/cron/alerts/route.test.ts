import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockProcessRecurringAlerts = vi.hoisted(() => vi.fn());

vi.mock("@crm-fran/api", () => ({
  processRecurringAlerts: mockProcessRecurringAlerts,
}));

describe("GET /api/cron/alerts", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("CRON_SECRET", "test-secret");
    mockProcessRecurringAlerts.mockReset();
  });

  it("returns 401 when the authorization header is missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/cron/alerts", { method: "GET" }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 when the authorization secret is wrong", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/cron/alerts", {
        method: "GET",
        headers: { Authorization: "Bearer wrong-secret" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns the processed count when the secret is correct", async () => {
    mockProcessRecurringAlerts.mockResolvedValue(3);

    const response = await GET(
      new NextRequest("http://localhost/api/cron/alerts", {
        method: "GET",
        headers: { Authorization: "Bearer test-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 3 });
    expect(mockProcessRecurringAlerts).toHaveBeenCalledOnce();
  });
});
