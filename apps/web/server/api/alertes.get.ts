export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const aujourdhui = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  return listerAlertes(aujourdhui);
});
