import type { Role } from "@projet/db/schema";

type Identity = { sub: string; name: string; email: string; role: Role };

const ACCOUNTS: Record<string, Identity> = {
  test: { sub: "dev-test-001", name: "Test membre", email: "test@dev.local", role: "membre" },
  admin: { sub: "dev-admin-001", name: "Test owner", email: "admin@dev.local", role: "owner" },
};

export default defineEventHandler(async (event) => {
  if (env().ENVIRONNEMENT !== "dev") {
    refuse(404, "Connexion de développement indisponible");
  }
  const requested = String(getQuery(event).comme ?? "test");
  const identity = ACCOUNTS[requested] ?? ACCOUNTS.test;
  if (!identity) throw createError({ statusCode: 500 });
  await upsertUser(identity);
  await setUserSession(event, {
    user: { id: identity.sub, role: identity.role, email: identity.email, name: identity.name },
  });
  return sendRedirect(event, "/tableau-de-bord");
});
