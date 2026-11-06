import { createDatabase } from "@projet/db";
import * as Sentry from "@sentry/node";

import { readEnv } from "./env";
import { start } from "./worker";

const env = readEnv(process.env);
if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, release: env.GIT_SHA, environment: env.ENVIRONNEMENT });
}

const db = createDatabase(env.DATABASE_URL, 5);
const boss = await start(env.DATABASE_URL, db);
console.log(`worker démarré (${env.GIT_SHA})`);

// Arrêt propre : les tâches en cours finissent, aucune n'est reprise ensuite
// par ce conteneur. Le délai suit stop_grace_period du compose.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, async () => {
    console.log(`${signal} : arrêt du worker`);
    await boss.stop({ graceful: true, timeout: 30_000 });
    await db.$client.end();
    process.exit(0);
  });
}
