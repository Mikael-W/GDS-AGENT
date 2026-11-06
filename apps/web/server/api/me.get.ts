export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);
  const compte = await trouver(user.id);
  if (!compte) refuser(404, "Compte inconnu");
  return compte;
});
