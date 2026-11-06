import { z } from "zod";

const Input = z.object({ name: z.string().trim().min(1, "Le nom est vide").max(200) });

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);
  const result = Input.safeParse(await readBody(event));
  if (!result.success) {
    refuse(400, result.error.issues[0]?.message ?? "Saisie invalide");
  }
  await rename(user.id, result.data.name);
  return { ok: true };
});
