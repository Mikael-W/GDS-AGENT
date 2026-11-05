import type { Role } from "@projet/db/schema";

type Identite = { sub: string; nom: string; email: string; role: Role };

const COMPTES: Record<string, Identite> = {
  test: { sub: "dev-test-001", nom: "Test membre", email: "test@dev.local", role: "membre" },
  admin: { sub: "dev-admin-001", nom: "Test owner", email: "admin@dev.local", role: "owner" },
};

export default defineEventHandler(async (event) => {
  if (env().ENVIRONNEMENT !== "dev") {
    throw createError({
      statusCode: 404,
      statusMessage: "Connexion de développement indisponible",
    });
  }
  const demande = String(getQuery(event).comme ?? "test");
  const identite = COMPTES[demande] ?? COMPTES.test;
  if (!identite) throw createError({ statusCode: 500 });
  await enregistrer(identite);
  await setUserSession(event, {
    user: { id: identite.sub, role: identite.role, email: identite.email, nom: identite.nom },
  });
  return sendRedirect(event, "/tableau-de-bord");
});
