export default defineEventHandler(async (event) => {
  if (env().ENVIRONNEMENT !== "dev") {
    refuser(404, "Synchro de développement indisponible");
  }
  await requireUserSession(event);
  const resultat = await synchroniserDepuisCiril();
  return resultat;
});
