import type { Role } from "@projet/db/schema";

/**
 * Fournisseur d'identité de l'équipe AI Sisters dans le realm du client
 * (`connexion_aisisters: true` dans aisisters-apps) : qui entre par lui est
 * `owner`. Keycloak le signale par le claim `identity_provider` du jeton.
 */
export const FOURNISSEUR_OWNER = "aisisters";

/**
 * Rôle lu dans le jeton d'accès rendu par Keycloak à la connexion (reçu du
 * point de jeton en TLS, côté serveur : pas de signature à revérifier ici).
 * Tout jeton illisible donne le rôle le plus faible.
 */
export function roleDepuisJeton(jetonAcces: string | undefined): Role {
  const charge = jetonAcces?.split(".")[1];
  if (!charge) return "membre";
  try {
    const contenu = JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as {
      identity_provider?: unknown;
    };
    return contenu.identity_provider === FOURNISSEUR_OWNER ? "owner" : "membre";
  } catch {
    return "membre";
  }
}
