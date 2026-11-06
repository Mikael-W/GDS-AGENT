import { parisToday } from "#shared/domain/display";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const params = AlertParameters.safeParse(getRouterParams(event, { decode: true }));
  if (!params.success) refuse(404, "Alerte inconnue");

  const details = await alertDetail(params.data.reference, params.data.family, parisToday());
  if (!details) {
    refuse(404, "Cette alerte n'existe plus : son échéance a peut-être changé.");
  }
  return details;
});
