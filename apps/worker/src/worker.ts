import type { Database } from "@projet/db";
import { PgBoss } from "pg-boss";

import { beat, HEARTBEAT_CRON, HEARTBEAT_QUEUE } from "./heartbeat";

/**
 * Démarre pg-boss sur la base de l'application (schéma `pgboss`, créé et
 * migré par pg-boss lui-même), déclare les files et les tâches planifiées,
 * puis branche les handlers. Rend l'instance pour l'arrêt propre.
 */
export async function start(url: string, db: Database): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString: url, schema: "pgboss" });
  boss.on("error", (error) => console.error("pg-boss :", error));
  await boss.start();

  await boss.createQueue(HEARTBEAT_QUEUE, { policy: "singleton" });
  await boss.schedule(HEARTBEAT_QUEUE, HEARTBEAT_CRON);
  await boss.work(HEARTBEAT_QUEUE, async () => {
    await beat(db);
  });
  // Premier battement tout de suite : /health/ready est vert dès le
  // démarrage, sans attendre la minute suivante.
  await beat(db);

  return boss;
}
