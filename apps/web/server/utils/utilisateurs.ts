import { type Role, type Utilisateur, utilisateurs } from "@projet/db/schema";
import { eq, sql } from "drizzle-orm";

import { base } from "./base";

export type Identite = {
  sub: string;
  email?: string | null;
  nom?: string | null;
  role?: Role;
};

export async function enregistrer(identite: Identite, db = base()): Promise<Utilisateur> {
  const role = identite.role ?? "membre";
  const [ligne] = await db
    .insert(utilisateurs)
    .values({ sub: identite.sub, email: identite.email, nom: identite.nom, role })
    .onConflictDoUpdate({
      target: utilisateurs.sub,
      set: { email: identite.email, role, vuLe: sql`now()` },
    })
    .returning();
  if (!ligne) throw new Error("Enregistrement du compte impossible");
  return ligne;
}

export async function trouver(sub: string, db = base()): Promise<Utilisateur | undefined> {
  return db.query.utilisateurs.findFirst({ where: eq(utilisateurs.sub, sub) });
}

export async function renommer(sub: string, nom: string, db = base()): Promise<void> {
  await db.update(utilisateurs).set({ nom }).where(eq(utilisateurs.sub, sub));
}
