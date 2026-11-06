import { synchronizations } from "@projet/db/schema";
import { eq, sql } from "drizzle-orm";
import { CirilError } from "./ciril";
import { getDb } from "./db";

export type SynchronizationReport = {
  received: number;
  inserted: number;
  updated: number;
};

const REASON_LENGTH = 300;

function failureReason(error: unknown): string {
  if (error instanceof CirilError) {
    return error.message.split(" : ")[0] ?? "CIRIL a refusé la requête";
  }
  const text = error instanceof Error ? error.message : String(error);
  return text.slice(0, REASON_LENGTH);
}

export async function journal<T extends SynchronizationReport>(
  travail: () => Promise<T>,
  db = getDb(),
): Promise<T> {
  const [row] = await db.insert(synchronizations).values({}).returning({ id: synchronizations.id });
  if (!row) throw new Error("Le journal des synchronisations n'a pas pu être écrit");
  const aLaLigne = eq(synchronizations.id, row.id);

  let bilan: T;
  try {
    bilan = await travail();
  } catch (error) {
    await db
      .update(synchronizations)
      .set({ result: "echec", finishedOn: sql`now()`, error: failureReason(error) })
      .where(aLaLigne)
      .catch(() => undefined);
    throw error;
  }

  await db
    .update(synchronizations)
    .set({
      result: "succes",
      finishedOn: sql`now()`,
      contractsRead: bilan.received,
      contractsModified: bilan.inserted + bilan.updated,
    })
    .where(aLaLigne);
  return bilan;
}
