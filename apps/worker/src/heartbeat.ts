import { type Database, schema } from "@projet/db";
import { sql } from "drizzle-orm";

/** Tâche planifiée qui prouve que le planificateur et un worker tournent. */
export const BATTEMENT = "maintenance.battement";

/** Chaque minute : une seule exécution à la fois sur l'ensemble des workers. */
export const HEARTBEAT_CRON = "* * * * *";

export async function battre(db: Database): Promise<void> {
  await db
    .insert(schema.heartbeats)
    .values({ service: "planificateur" })
    .onConflictDoUpdate({ target: schema.heartbeats.service, set: { vuLe: sql`now()` } });
}
