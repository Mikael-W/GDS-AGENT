import { z } from "zod";

export const DEV_SECRET = "secret-de-developpement-a-ne-jamais-utiliser-en-prod";
const DEV_DATABASE = "postgres://app:app@127.0.0.1:5440/app";

const schema = z
  .object({
    ENVIRONNEMENT: z.enum(["dev", "test", "prod"]).default("dev"),
    AUTH_SECRET: z.string().min(32),
    AUTH_KEYCLOAK_ISSUER: z.url(),
    AUTH_KEYCLOAK_ID: z.string().min(1),
    AUTH_KEYCLOAK_SECRET: z.string().min(1),
    AUTH_URL: z.url().default("http://localhost:9999"),
    DATABASE_URL: z.string().startsWith("postgres").default(DEV_DATABASE),
    SENTRY_DSN: z.string().default(""),
    GIT_SHA: z.string().default("dev"),
    AWS_REGION: z.literal("eu-west-3").default("eu-west-3"),
    LLM_MODELE: z.string().default("eu.anthropic.claude-sonnet-4-5-20250929-v1:0"),
    CIRIL_URL: z.url().optional(),
    CIRIL_UTILISATEUR: z.string().optional(),
    CIRIL_MOT_DE_PASSE: z.string().optional(),
  })
  .superRefine((r, ctx) => {
    if (r.ENVIRONNEMENT !== "prod") return;
    const refuse = (message: string) => ctx.addIssue({ code: "custom", message });
    if (r.AUTH_SECRET === DEV_SECRET) refuse("AUTH_SECRET garde la valeur de développement");
    if (!r.AUTH_KEYCLOAK_ISSUER.startsWith("https://"))
      refuse("AUTH_KEYCLOAK_ISSUER doit être en https");
    if (!r.AUTH_URL.startsWith("https://")) refuse("AUTH_URL doit être en https");
    if (r.DATABASE_URL === DEV_DATABASE || r.DATABASE_URL.includes(":app@")) {
      refuse("DATABASE_URL garde le mot de passe de développement");
    }
    if (!r.SENTRY_DSN) refuse("SENTRY_DSN est vide (projet GlitchTip)");
    if (r.GIT_SHA === "dev") refuse("GIT_SHA absent : image construite hors CI");
  });

export type Env = z.infer<typeof schema>;

export function readEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => (i.path.length ? `${i.path.join(".")} : ${i.message}` : i.message))
      .join(" ; ");
    throw new Error(`Réglages refusés : ${details}`);
  }
  return result.data;
}

let memo: Env | undefined;

export function env(): Env {
  memo ??= readEnv(process.env);
  return memo;
}
