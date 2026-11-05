import { aujourdhuiParis } from "#shared/domaine/affichage";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const params = ParametresAlerte.safeParse(getRouterParams(event, { decode: true }));
  if (!params.success) throw createError({ statusCode: 404, statusMessage: "Alerte inconnue" });

  const detail = await detailAlerte(params.data.reference, params.data.famille, aujourdhuiParis());
  if (!detail) {
    throw createError({
      statusCode: 404,
      statusMessage: "Cette alerte n'existe plus : son échéance a peut-être changé.",
    });
  }
  return detail;
});
