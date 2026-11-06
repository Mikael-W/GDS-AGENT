import { type Role, type User, users } from "@projet/db/schema";
import { eq, sql } from "drizzle-orm";

import { getDb } from "./db";

export type Identity = {
  sub: string;
  email?: string | null;
  name?: string | null;
  role?: Role;
};

export async function upsertUser(identity: Identity, db = getDb()): Promise<User> {
  const role = identity.role ?? "membre";
  const [row] = await db
    .insert(users)
    .values({ sub: identity.sub, email: identity.email, name: identity.name, role })
    .onConflictDoUpdate({
      target: users.sub,
      set: { email: identity.email, role, seenAt: sql`now()` },
    })
    .returning();
  if (!row) throw new Error("Enregistrement du compte impossible");
  return row;
}

export async function findBySub(sub: string, db = getDb()): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.sub, sub) });
}

export async function rename(sub: string, name: string, db = getDb()): Promise<void> {
  await db.update(users).set({ name }).where(eq(users.sub, sub));
}
