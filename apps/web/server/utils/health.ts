import { schema } from "@projet/db";
import { eq, sql } from "drizzle-orm";

import { getDb } from "./db";

export type Check = () => Promise<void>;

export const SCHEDULER_SILENCE_MS = 3 * 60_000;

export function requireRecentHeartbeat(seenAt: Date | undefined, now = new Date()): void {
  if (!seenAt) throw new Error("aucun battement du planificateur");
  if (now.getTime() - seenAt.getTime() > SCHEDULER_SILENCE_MS) {
    throw new Error("planificateur silencieux");
  }
}

export const checks: Record<string, Check> = {
  base: async () => {
    await getDb().execute(sql`select 1`);
  },
  planificateur: async () => {
    const row = await getDb().query.heartbeats.findFirst({
      where: eq(schema.heartbeats.service, "planificateur"),
    });
    requireRecentHeartbeat(row?.seenAt);
  },
};

export async function verify(toRun: Record<string, Check> = checks) {
  const results: Record<string, string> = {};
  for (const [name, check] of Object.entries(toRun)) {
    try {
      await check();
      results[name] = "ok";
    } catch (error) {
      results[name] = `erreur : ${error instanceof Error ? error.name : "inconnue"}`;
    }
  }
  const ok = Object.values(results).every((v) => v === "ok");
  return { ok, body: { statut: ok ? "ok" : "erreur", controles: results } };
}
