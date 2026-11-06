import { parisToday } from "#shared/domain/display";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);
  const params = AlertParameters.safeParse(getRouterParams(event, { decode: true }));
  if (!params.success) refuse(404, "Alerte inconnue");

  const saisie = TreatmentBody.safeParse(await readBody(event));
  if (!saisie.success) {
    refuse(400, saisie.error.issues[0]?.message ?? "Saisie invalide");
  }

  const issue = await treatAlert(
    { ...params.data, comment: saisie.data.comment, treatedBy: user.id },
    parisToday(),
  );
  if (issue === "inconnue") {
    refuse(404, "Cette alerte n'existe plus : son échéance a peut-être changé.");
  }
  if (issue === "deja_traitee") {
    refuse(409, "Cette alerte a déjà été traitée par un collègue.");
  }
  return { ok: true };
});
