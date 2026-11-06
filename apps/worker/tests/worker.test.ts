import { createDatabase, schema } from "@projet/db";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { beat, HEARTBEAT_QUEUE } from "../src/heartbeat";
import { start } from "../src/worker";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("worker (PostgreSQL database)", () => {
  const db = createDatabase(url ?? "", 2);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
    await db.delete(schema.heartbeats);
  });
  afterAll(() => db.$client.end());

  it("the heartbeat is idempotent and advances the timestamp", async () => {
    await beat(db);
    const first = await db.query.heartbeats.findFirst({
      where: eq(schema.heartbeats.service, "planificateur"),
    });
    await beat(db);
    const rows = await db.select().from(schema.heartbeats);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.seenAt.getTime()).toBeGreaterThanOrEqual(first?.seenAt.getTime() ?? 0);
  });

  it("the worker beats as soon as it starts", async () => {
    await db.delete(schema.heartbeats);
    const boss = await start(url ?? "", db);
    try {
      expect(await db.select().from(schema.heartbeats)).toHaveLength(1);
    } finally {
      await boss.stop({ graceful: true, timeout: 5_000 });
    }
    // Premier démarrage : pg-boss crée son schéma, ce qui dépasse le délai par défaut.
  }, 20_000);

  it("a heartbeat sent to the queue is processed by the worker", async () => {
    const boss = await start(url ?? "", db);
    await db.delete(schema.heartbeats);
    try {
      await boss.send(HEARTBEAT_QUEUE);
      const deadline = Date.now() + 15_000;
      let seen = false;
      while (!seen && Date.now() < deadline) {
        seen = (await db.select().from(schema.heartbeats)).length === 1;
        if (!seen) await new Promise((r) => setTimeout(r, 200));
      }
      expect(seen).toBe(true);
    } finally {
      await boss.stop({ graceful: true, timeout: 5_000 });
    }
  }, 20_000);
});
