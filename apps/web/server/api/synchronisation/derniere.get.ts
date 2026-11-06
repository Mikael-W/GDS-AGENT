import { schema } from "@projet/db";
import { desc, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const row = await getDb().query.synchronizations.findFirst({
    where: eq(schema.synchronizations.result, "succes"),
    orderBy: desc(schema.synchronizations.finishedOn),
  });
  return { finishedOn: row?.finishedOn ?? null };
});
