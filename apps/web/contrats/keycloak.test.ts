import { expect, it } from "vitest";

/** Keycloak : le realm du client publie sa configuration OIDC et ses clés RS256. */
const getDb = (process.env.KEYCLOAK_URL ?? "https://auth.agents.aisisters.ai").replace(/\/$/, "");
const realm = process.env.KEYCLOAK_REALM ?? "apps";

it("configuration OIDC du realm", async () => {
  const response = await fetch(`${getDb}/realms/${realm}/.well-known/openid-configuration`);
  expect(response.status, `realm ${realm} introuvable`).toBe(200);
  const conf = (await response.json()) as Record<string, unknown>;
  expect(conf.issuer).toBe(`${getDb}/realms/${realm}`);
  expect(conf.code_challenge_methods_supported).toContain("S256");
  for (const field of [
    "authorization_endpoint",
    "token_endpoint",
    "jwks_uri",
    "end_session_endpoint",
  ]) {
    expect(String(conf[field])).toMatch(/^https:\/\//);
  }
  const { keys } = (await (await fetch(String(conf.jwks_uri))).json()) as {
    keys: { kty: string; alg?: string }[];
  };
  expect(keys.some((k) => k.kty === "RSA" && k.alg === "RS256")).toBe(true);
});
