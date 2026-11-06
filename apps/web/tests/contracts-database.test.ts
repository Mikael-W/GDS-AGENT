import { createDatabase, schema } from "@projet/db";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { listContracts } from "@/server/utils/contracts";

const url = process.env.TEST_DATABASE_URL;

const FINGERPRINT = "0".repeat(64);

describe.skipIf(!url)("liste des marchés lue dans la base de l'agent", () => {
  const db = createDatabase(url ?? "", 1);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });
  afterAll(() => db.$client.end());

  describe("Given a three-lot contract and a lotless contract copied from CIRIL", () => {
    beforeAll(async () => {
      await db.delete(schema.contracts);
      const [genieCivil] = await db
        .insert(schema.contracts)
        .values({
          reference: "MA 24036",
          subject: "Travaux de génie civil, station de relevage",
          service: "Travaux",
          initialAmount: "636900.00",
          fingerprint: FINGERPRINT,
        })
        .returning();
      await db.insert(schema.contracts).values({
        reference: "AO 24034",
        subject: "Travaux sur le réseau d'eau potable",
        service: "Pôle eau",
        fingerprint: FINGERPRINT,
      });
      await db.insert(schema.lots).values(
        ["01", "02", "03"].map((numero) => ({
          contractId: genieCivil?.id ?? 0,
          reference: `MA 24036-${numero}`,
          numero,
          fingerprint: FINGERPRINT,
        })),
      );
    });

    describe("When contracts are listed", () => {
      test("Then they are sorted by contract number", async () => {
        const list = await listContracts(db);

        expect(list.map((m) => m.reference)).toEqual(["AO 24034", "MA 24036"]);
      });

      test("Then each contract carries its number of lots", async () => {
        const list = await listContracts(db);

        expect(list.map((m) => m.lots)).toEqual([0, 3]);
      });

      test("Then the initial notified amount is returned as CIRIL gives it", async () => {
        const list = await listContracts(db);

        expect(list.find((m) => m.reference === "MA 24036")?.initialAmount).toBe("636900.00");
      });
    });
  });
});
