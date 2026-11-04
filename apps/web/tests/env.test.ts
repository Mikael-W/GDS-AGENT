import { describe, expect, it } from "vitest";

import { lireEnv, SECRET_DE_DEV } from "@/lib/env";

const base = {
  AUTH_KEYCLOAK_ISSUER: "https://auth.exemple.test/realms/client",
  AUTH_KEYCLOAK_ID: "client-web",
  AUTH_KEYCLOAK_SECRET: "secret",
};

describe("réglages", () => {
  it("acceptent les valeurs de développement hors production", () => {
    const e = lireEnv({ ...base, AUTH_SECRET: SECRET_DE_DEV });
    expect(e.ENVIRONNEMENT).toBe("dev");
    expect(e.GIT_SHA).toBe("dev");
  });

  it("refusent en production les valeurs de développement", () => {
    expect(() => lireEnv({ ...base, ENVIRONNEMENT: "prod", AUTH_SECRET: SECRET_DE_DEV })).toThrow(
      /AUTH_SECRET garde la valeur de développement.*SENTRY_DSN est vide.*GIT_SHA absent/,
    );
  });

  it("acceptent une configuration de production complète", () => {
    const e = lireEnv({
      ...base,
      ENVIRONNEMENT: "prod",
      AUTH_SECRET: "un-vrai-secret-de-production-tire-au-hasard-0123",
      AUTH_URL: "https://client.exemple.test",
      DATABASE_URL: "postgres://app:3f9a1c@db:5432/app",
      SENTRY_DSN: "https://cle@errors.exemple.test/1",
      GIT_SHA: "abc1234",
    });
    expect(e.GIT_SHA).toBe("abc1234");
  });

  it("signalent une variable obligatoire absente par son nom", () => {
    expect(() => lireEnv({ ...base })).toThrow(/AUTH_SECRET/);
  });
});
