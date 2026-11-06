import type { Database } from "@projet/db";
import { PgBoss } from "pg-boss";

import { BATTEMENT, battre, HEARTBEAT_CRON } from "./heartbeat";

/**
 * Démarre pg-boss sur la base de l'application (schéma `pgboss`, créé et
 * migré par pg-boss lui-même), déclare les files et les tâches planifiées,
 * puis branche les handlers. Rend l'instance pour l'arrêt propre.
 */
export async function demarrer(url: string, db: Database): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString: url, schema: "pgboss" });
  boss.on("error", (error) => console.error("pg-boss :", error));
  await boss.start();

  await boss.createQueue(BATTEMENT, { policy: "singleton" });
  await boss.schedule(BATTEMENT, HEARTBEAT_CRON);
  await boss.work(BATTEMENT, async () => {
    await battre(db);
  });
  // Premier battement tout de suite : /health/ready est vert dès le
  // démarrage, sans attendre la minute suivante.
  await battre(db);

  return boss;
}
