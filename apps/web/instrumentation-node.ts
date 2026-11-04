import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

/**
 * Réglages validés (refus en production des valeurs de développement), puis
 * erreurs du serveur vers GlitchTip. Chargé par instrumentation.ts, runtime
 * Node seulement.
 */
let e: ReturnType<typeof env>;
try {
  e = env();
} catch (erreur) {
  // Arrêt franc : le conteneur échoue, le déploiement revient en arrière.
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exit(1);
}
if (e.SENTRY_DSN) {
  Sentry.init({
    dsn: e.SENTRY_DSN,
    release: e.GIT_SHA,
    environment: e.ENVIRONNEMENT,
  });
}
