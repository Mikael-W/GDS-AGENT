import { parisToday } from "#shared/domain/display";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  return listAlerts(parisToday());
});
