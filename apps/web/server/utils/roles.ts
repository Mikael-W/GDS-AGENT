import type { Role } from "@projet/db/schema";

export const FOURNISSEUR_OWNER = "aisisters";

export function roleDepuisJeton(jetonAcces: string | undefined): Role {
  const charge = jetonAcces?.split(".")[1];
  if (!charge) return "membre";
  try {
    const content = JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as {
      identity_provider?: unknown;
    };
    return content.identity_provider === FOURNISSEUR_OWNER ? "owner" : "membre";
  } catch {
    return "membre";
  }
}
