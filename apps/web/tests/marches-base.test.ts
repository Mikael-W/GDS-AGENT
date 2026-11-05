import { creerBase, schema } from "@projet/db";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { listerMarches } from "@/server/utils/marches";

const url = process.env.TEST_DATABASE_URL;

const EMPREINTE = "0".repeat(64);

describe.skipIf(!url)("liste des marchés lue dans la base de l'agent", () => {
  const db = creerBase(url ?? "", 1);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });
  afterAll(() => db.$client.end());

  describe("Given un marché de trois lots et un marché sans lot recopiés de CIRIL", () => {
    beforeAll(async () => {
      await db.delete(schema.marches);
      const [genieCivil] = await db
        .insert(schema.marches)
        .values({
          reference: "MA 24036",
          objet: "Travaux de génie civil, station de relevage",
          service: "Travaux",
          montantInitial: "636900.00",
          empreinte: EMPREINTE,
        })
        .returning();
      await db.insert(schema.marches).values({
        reference: "AO 24034",
        objet: "Travaux sur le réseau d'eau potable",
        service: "Pôle eau",
        empreinte: EMPREINTE,
      });
      await db.insert(schema.lots).values(
        ["01", "02", "03"].map((numero) => ({
          marcheId: genieCivil?.id ?? 0,
          reference: `MA 24036-${numero}`,
          numero,
          empreinte: EMPREINTE,
        })),
      );
    });

    describe("When on liste les marchés", () => {
      test("Then ils sont triés par numéro de marché", async () => {
        const liste = await listerMarches(db);

        expect(liste.map((m) => m.reference)).toEqual(["AO 24034", "MA 24036"]);
      });

      test("Then chaque marché porte le nombre de ses lots", async () => {
        const liste = await listerMarches(db);

        expect(liste.map((m) => m.lots)).toEqual([0, 3]);
      });

      test("Then le montant notifié initial est restitué tel que CIRIL le donne", async () => {
        const liste = await listerMarches(db);

        expect(liste.find((m) => m.reference === "MA 24036")?.montantInitial).toBe("636900.00");
      });
    });
  });
});
