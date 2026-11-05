import { z } from "zod";

const Saisie = z.object({ nom: z.string().trim().min(1, "Le nom est vide").max(200) });

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);
  const resultat = Saisie.safeParse(await readBody(event));
  if (!resultat.success) {
    throw createError({
      statusCode: 400,
      statusMessage: resultat.error.issues[0]?.message ?? "Saisie invalide",
    });
  }
  await renommer(user.id, resultat.data.nom);
  return { ok: true };
});
