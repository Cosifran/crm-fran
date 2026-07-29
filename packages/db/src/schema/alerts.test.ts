import { describe, it, expect } from "vitest";
import { alerts, alertsRelations, ALERT_KIND, ALERT_SEVERITY } from "./alerts";

describe("alerts schema", () => {
	it("exports the alerts table", () => {
		expect(alerts).toBeDefined();
	});

	it("exports alert kind and severity constants", () => {
		expect(ALERT_KIND.NO_CONTACT).toBe("no_contact");
		expect(ALERT_KIND.FOLLOW_UP).toBe("follow_up");
		expect(ALERT_SEVERITY.INFO).toBe("info");
		expect(ALERT_SEVERITY.WARNING).toBe("warning");
		expect(ALERT_SEVERITY.HIGH).toBe("high");
		expect(ALERT_SEVERITY.URGENT).toBe("urgent");
	});

	it("exports relations", () => {
		expect(alertsRelations).toBeDefined();
	});
});
