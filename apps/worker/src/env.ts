import { z } from "zod";

/**
 * Réglages du worker, validés au démarrage. Comme le web, il refuse de
 * démarrer en production avec une valeur de développement.
 */
const BASE_DE_DEV = "postgres://app:app@127.0.0.1:5440/app";

const schema = z
  .object({
    ENVIRONNEMENT: z.enum(["dev", "test", "prod"]).default("dev"),
    DATABASE_URL: z.string().startsWith("postgres").default(BASE_DE_DEV),
    SENTRY_DSN: z.string().default(""),
    GIT_SHA: z.string().default("dev"),
  })
  .superRefine((r, ctx) => {
    if (r.ENVIRONNEMENT !== "prod") return;
    const refuser = (message: string) => ctx.addIssue({ code: "custom", message });
    if (r.DATABASE_URL === BASE_DE_DEV || r.DATABASE_URL.includes(":app@")) {
      refuser("DATABASE_URL garde le mot de passe de développement");
    }
    if (!r.SENTRY_DSN) refuser("SENTRY_DSN est vide (projet GlitchTip)");
    if (r.GIT_SHA === "dev") refuser("GIT_SHA absent : image construite hors CI");
  });

export type Env = z.infer<typeof schema>;

export function lireEnv(source: Record<string, string | undefined>): Env {
  const resultat = schema.safeParse(source);
  if (!resultat.success) {
    const detail = resultat.error.issues
      .map((i) => (i.path.length ? `${i.path.join(".")} : ${i.message}` : i.message))
      .join(" ; ");
    throw new Error(`Réglages refusés : ${detail}`);
  }
  return resultat.data;
}
