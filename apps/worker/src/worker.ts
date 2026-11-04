import type { Base } from "@projet/db";
import { PgBoss } from "pg-boss";

import { BATTEMENT, battre, CRON_BATTEMENT } from "./battement";

/**
 * Démarre pg-boss sur la base de l'application (schéma `pgboss`, créé et
 * migré par pg-boss lui-même), déclare les files et les tâches planifiées,
 * puis branche les handlers. Rend l'instance pour l'arrêt propre.
 */
export async function demarrer(url: string, db: Base): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString: url, schema: "pgboss" });
  boss.on("error", (erreur) => console.error("pg-boss :", erreur));
  await boss.start();

  await boss.createQueue(BATTEMENT, { policy: "singleton" });
  await boss.schedule(BATTEMENT, CRON_BATTEMENT);
  await boss.work(BATTEMENT, async () => {
    await battre(db);
  });
  // Premier battement tout de suite : /health/ready est vert dès le
  // démarrage, sans attendre la minute suivante.
  await battre(db);

  return boss;
}
