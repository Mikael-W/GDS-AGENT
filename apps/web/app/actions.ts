"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, signIn, signOut } from "@/auth";
import { env } from "@/lib/env";
import { jetonDeSession } from "@/lib/session";
import { renommer } from "@/lib/utilisateurs";

export async function seConnecter() {
  await signIn("keycloak", { redirectTo: "/" });
}

/** Ferme la session ici ET chez Keycloak (sinon la reconnexion est silencieuse). */
export async function seDeconnecter() {
  const e = env();
  const idToken = (await jetonDeSession())?.idToken;
  await signOut({ redirect: false });
  const fin = new URL(`${e.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/logout`);
  fin.searchParams.set("post_logout_redirect_uri", e.AUTH_URL);
  if (idToken) fin.searchParams.set("id_token_hint", idToken);
  redirect(fin.toString());
}

const Renommage = z.object({ nom: z.string().trim().min(1, "Le nom est vide").max(200) });

export type EtatRenommage = { erreur?: string; ok?: boolean };

/** Exemple d'action serveur : entrée validée par Zod, écriture par Drizzle. */
export async function changerNom(
  _etat: EtatRenommage,
  formulaire: FormData,
): Promise<EtatRenommage> {
  const session = await auth();
  if (!session?.user?.id) return { erreur: "Connexion requise" };
  const saisie = Renommage.safeParse({ nom: formulaire.get("nom") });
  if (!saisie.success) return { erreur: saisie.error.issues[0]?.message ?? "Saisie invalide" };
  await renommer(session.user.id, saisie.data.nom);
  revalidatePath("/");
  return { ok: true };
}
