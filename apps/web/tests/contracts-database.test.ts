import { createDatabase, schema } from "@projet/db";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { listContracts } from "@/server/utils/contracts";

const url = process.env.TEST_DATABASE_URL;

const EMPREINTE = "0".repeat(64);

describe.skipIf(!url)("liste des marchés lue dans la base de l'agent", () => {
  const db = createDatabase(url ?? "", 1);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });
  afterAll(() => db.$client.end());

  describe("Given un marché de trois lots et un marché sans lot recopiés de CIRIL", () => {
    beforeAll(async () => {
      await db.delete(schema.contracts);
      const [genieCivil] = await db
        .insert(schema.contracts)
        .values({
          reference: "MA 24036",
          subject: "Travaux de génie civil, station de relevage",
          service: "Travaux",
          initialAmount: "636900.00",
          fingerprint: EMPREINTE,
        })
        .returning();
      await db.insert(schema.contracts).values({
        reference: "AO 24034",
        subject: "Travaux sur le réseau d'eau potable",
        service: "Pôle eau",
        fingerprint: EMPREINTE,
      });
      await db.insert(schema.lots).values(
        ["01", "02", "03"].map((numero) => ({
          contractId: genieCivil?.id ?? 0,
          reference: `MA 24036-${numero}`,
          numero,
          fingerprint: EMPREINTE,
        })),
      );
    });

    describe("When on liste les marchés", () => {
      test("Then ils sont triés par numéro de marché", async () => {
        const liste = await listContracts(db);

        expect(liste.map((m) => m.reference)).toEqual(["AO 24034", "MA 24036"]);
      });

      test("Then chaque marché porte le nombre de ses lots", async () => {
        const liste = await listContracts(db);

        expect(liste.map((m) => m.lots)).toEqual([0, 3]);
      });

      test("Then le montant notifié initial est restitué tel que CIRIL le donne", async () => {
        const liste = await listContracts(db);

        expect(liste.find((m) => m.reference === "MA 24036")?.initialAmount).toBe("636900.00");
      });
    });
  });
});
