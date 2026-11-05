export default defineEventHandler(async (event) => {
  if (env().ENVIRONNEMENT !== "dev") {
    throw createError({ statusCode: 404, statusMessage: "Synchro de développement indisponible" });
  }
  await requireUserSession(event);
  const resultat = await synchroniserDepuisCiril();
  return resultat;
});
