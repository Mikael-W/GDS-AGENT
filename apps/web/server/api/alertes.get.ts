import { aujourdhuiParis } from "#shared/domaine/affichage";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  return listerAlertes(aujourdhuiParis());
});
