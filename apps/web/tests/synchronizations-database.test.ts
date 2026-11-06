import { createDatabase, schema } from "@projet/db";
import { asc } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { CirilError } from "@/server/utils/ciril";
import { journal } from "@/server/utils/synchronizations";

const url = process.env.TEST_DATABASE_URL;

const report = { received: 3, inserted: 1, updated: 1 };

describe.skipIf(!url)("journal des synchronisations avec CIRIL", () => {
  const db = createDatabase(url ?? "", 1);

  const rows = () =>
    db.select().from(schema.synchronizations).orderBy(asc(schema.synchronizations.id));

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });
  afterAll(() => db.$client.end());

  describe("Given a CIRIL reading that returns three contracts, one new and one modified", () => {
    describe("When the synchronization ends well", () => {
      let duringReading: string | undefined;

      beforeAll(async () => {
        await db.delete(schema.synchronizations);
        await journal(async () => {
          duringReading = (await rows())[0]?.result;
          return report;
        }, db);
      });

      test("Then it is visible as running during the reading", () => {
        expect(duringReading).toBe("en_cours");
      });

      test("Then it is then recorded as succeeded, with its end time", async () => {
        const [row] = await rows();

        expect(row?.result).toBe("succes");
        expect(row?.finishedOn).not.toBeNull();
      });

      test("Then it counts three contracts read and two modified", async () => {
        const [row] = await rows();

        expect([row?.contractsRead, row?.contractsModified]).toEqual([3, 2]);
      });
    });
  });

  describe("Given a CIRIL reading that fails for lack of access", () => {
    describe("When the synchronization stops", () => {
      const refusal = new Error("Aucun point d'accès Finances pour cet utilisateur CIRIL");
      let raised: unknown;

      beforeAll(async () => {
        await db.delete(schema.synchronizations);
        raised = await journal(async () => {
          throw refusal;
        }, db).catch((e) => e);
      });

      test("Then that same error is raised to the caller", () => {
        expect(raised).toBe(refusal);
      });

      test("Then the failure is recorded as such, with its end time", async () => {
        const [row] = await rows();

        expect(row?.result).toBe("echec");
        expect(row?.finishedOn).not.toBeNull();
      });

      test("Then its reason is recorded so that an outage is visible", async () => {
        const [row] = await rows();

        expect(row?.error).toBe("Aucun point d'accès Finances pour cet utilisateur CIRIL");
      });
    });
  });

  describe("Given an outage reported by something other than an error", () => {
    describe("When the synchronization stops", () => {
      beforeAll(async () => {
        await db.delete(schema.synchronizations);
        await journal(async () => {
          throw "connexion interrompue";
        }, db).catch(() => undefined);
      });

      test("Then the outage text is recorded as the reason", async () => {
        const [row] = await rows();

        expect(row?.error).toBe("connexion interrompue");
      });
    });
  });

  describe("Given a CIRIL error response that repeats the account password", () => {
    describe("When the synchronization stops", () => {
      beforeAll(async () => {
        await db.delete(schema.synchronizations);
        await journal(async () => {
          throw new CirilError(
            "CIRIL getAccessList 401 : Accès refusé <Password>Secret!2026</Password> pour AISISTERS",
          );
        }, db).catch(() => undefined);
      });

      test("Then only the response status is recorded, without the body", async () => {
        const [row] = await rows();

        expect(row?.error).toBe("CIRIL getAccessList 401");
      });
    });
  });

  describe("Given a successful synchronization followed by a failed one", () => {
    describe("When the log is read again", () => {
      beforeAll(async () => {
        await db.delete(schema.synchronizations);
        await journal(async () => report, db);
        await journal(async () => {
          throw new Error("CIRIL injoignable");
        }, db).catch(() => undefined);
      });

      test("Then both runs are kept in order", async () => {
        const results = (await rows()).map((row) => row.result);

        expect(results).toEqual(["succes", "echec"]);
      });
    });
  });
});
