export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);
  const compte = await trouver(user.id);
  if (!compte) throw createError({ statusCode: 404, statusMessage: "Compte inconnu" });
  return compte;
});
