import { aujourdhuiParis } from "#shared/domaine/affichage";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);
  const params = ParametresAlerte.safeParse(getRouterParams(event, { decode: true }));
  if (!params.success) throw createError({ statusCode: 404, statusMessage: "Alerte inconnue" });

  const saisie = CorpsTraitement.safeParse(await readBody(event));
  if (!saisie.success) {
    throw createError({
      statusCode: 400,
      statusMessage: saisie.error.issues[0]?.message ?? "Saisie invalide",
    });
  }

  const issue = await traiterAlerte(
    { ...params.data, commentaire: saisie.data.commentaire, traitePar: user.id },
    aujourdhuiParis(),
  );
  if (issue === "inconnue") {
    throw createError({
      statusCode: 404,
      statusMessage: "Cette alerte n'existe plus : son échéance a peut-être changé.",
    });
  }
  if (issue === "deja_traitee") {
    throw createError({
      statusCode: 409,
      statusMessage: "Cette alerte a déjà été traitée par un collègue.",
    });
  }
  return { ok: true };
});
