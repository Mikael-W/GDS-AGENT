import { createDatabase, schema } from "@projet/db";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BATTEMENT, battre } from "../src/heartbeat";
import { demarrer } from "../src/worker";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("worker (base PostgreSQL)", () => {
  const db = createDatabase(url ?? "", 2);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
    await db.delete(schema.heartbeats);
  });
  afterAll(() => db.$client.end());

  it("le battement est idempotent et avance l'horodatage", async () => {
    await battre(db);
    const premier = await db.query.heartbeats.findFirst({
      where: eq(schema.heartbeats.service, "planificateur"),
    });
    await battre(db);
    const rows = await db.select().from(schema.heartbeats);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.vuLe.getTime()).toBeGreaterThanOrEqual(premier?.vuLe.getTime() ?? 0);
  });

  it("le worker bat dès son démarrage", async () => {
    await db.delete(schema.heartbeats);
    const boss = await demarrer(url ?? "", db);
    try {
      expect(await db.select().from(schema.heartbeats)).toHaveLength(1);
    } finally {
      await boss.stop({ graceful: true, timeout: 5_000 });
    }
    // Premier démarrage : pg-boss crée son schéma, ce qui dépasse le délai par défaut.
  }, 20_000);

  it("un battement envoyé à la file est traité par le worker", async () => {
    const boss = await demarrer(url ?? "", db);
    await db.delete(schema.heartbeats);
    try {
      await boss.send(BATTEMENT);
      const fin = Date.now() + 15_000;
      let vu = false;
      while (!vu && Date.now() < fin) {
        vu = (await db.select().from(schema.heartbeats)).length === 1;
        if (!vu) await new Promise((r) => setTimeout(r, 200));
      }
      expect(vu).toBe(true);
    } finally {
      await boss.stop({ graceful: true, timeout: 5_000 });
    }
  }, 20_000);
});
