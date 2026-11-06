import { z } from "zod";

const Saisie = z.object({ name: z.string().trim().min(1, "Le nom est vide").max(200) });

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);
  const resultat = Saisie.safeParse(await readBody(event));
  if (!resultat.success) {
    refuse(400, resultat.error.issues[0]?.message ?? "Saisie invalide");
  }
  await rename(user.id, resultat.data.name);
  return { ok: true };
});
