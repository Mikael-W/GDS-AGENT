import { schema } from "@projet/db";
import { desc, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const ligne = await base().query.synchronisations.findFirst({
    where: eq(schema.synchronisations.resultat, "succes"),
    orderBy: desc(schema.synchronisations.termineeLe),
  });
  return { termineeLe: ligne?.termineeLe ?? null };
});
