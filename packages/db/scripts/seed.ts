import "./load-env";

import { faker } from "@faker-js/faker";
import { createDb } from "@crm-fran/db";
import { leads } from "@crm-fran/db/schema/leads";

const db = createDb();

async function seed() {
  await db.delete(leads);
  console.log("🗑️  Cleared leads table");

  const data = Array.from({ length: 10 }, (_, i) => {
    const index = (i + 1).toString().padStart(3, "0");
    return {
      id: crypto.randomUUID(),
      name: faker.person.fullName(),
      email: `lead-${index}@test.com`,
      phone: faker.phone.number().toString(),
    };
  });

  const inserted = await db.insert(leads).values(data).returning();
  console.log(`✅ Seeded ${inserted.length} leads`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
