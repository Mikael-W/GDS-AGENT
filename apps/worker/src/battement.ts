import { type Base, schema } from "@projet/db";
import { sql } from "drizzle-orm";

/** Tâche planifiée qui prouve que le planificateur et un worker tournent. */
export const BATTEMENT = "maintenance.battement";

/** Chaque minute : une seule exécution à la fois sur l'ensemble des workers. */
export const CRON_BATTEMENT = "* * * * *";

export async function battre(db: Base): Promise<void> {
  await db
    .insert(schema.battements)
    .values({ service: "planificateur" })
    .onConflictDoUpdate({ target: schema.battements.service, set: { vuLe: sql`now()` } });
}
