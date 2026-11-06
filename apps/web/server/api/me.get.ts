export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);
  const account = await trouver(user.id);
  if (!account) refuse(404, "Compte inconnu");
  return account;
});
