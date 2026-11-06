export default defineEventHandler(async (event) => {
  if (env().ENVIRONNEMENT !== "dev") {
    refuse(404, "Synchro de développement indisponible");
  }
  await requireUserSession(event);
  const result = await synchronizeFromCiril();
  return result;
});
