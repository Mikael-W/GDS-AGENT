import * as Sentry from "@sentry/nextjs";

/**
 * Démarrage du serveur : le code propre à Node (réglages validés, arrêt
 * franc, GlitchTip) vit dans instrumentation-node.ts, importé seulement par
 * le runtime Node : le runtime Edge ne le voit jamais.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}

export const onRequestError = Sentry.captureRequestError;
