import { creerBase, schema } from "@projet/db";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { journaliser } from "@/server/utils/synchronisations";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("journal des synchronisations avec CIRIL", () => {
  const db = creerBase(url ?? "", 1);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });
  afterAll(() => db.$client.end());

  describe("Given une lecture de CIRIL qui ramène trois marchés dont un nouveau et un modifié", () => {
    describe("When la synchronisation se termine bien", () => {
      beforeAll(async () => {
        await db.delete(schema.synchronisations);
        await journaliser(
          async () => ({ pointAcces: "Finances", recus: 3, inseres: 1, misAJour: 1, inchanges: 1 }),
          db,
        );
      });

      test("Then elle est enregistrée comme réussie, avec l'heure de fin", async () => {
        const [ligne] = await db.select().from(schema.synchronisations);

        expect(ligne?.resultat).toBe("succes");
        expect(ligne?.termineeLe).not.toBeNull();
      });

      test("Then elle compte trois marchés lus et deux modifiés", async () => {
        const [ligne] = await db.select().from(schema.synchronisations);

        expect([ligne?.marchesLus, ligne?.marchesModifies]).toEqual([3, 2]);
      });
    });
  });

  describe("Given une lecture de CIRIL qui échoue faute d'accès", () => {
    describe("When la synchronisation s'arrête", () => {
      let echec: unknown;

      beforeAll(async () => {
        await db.delete(schema.synchronisations);
        try {
          await journaliser(async () => {
            throw new Error("Aucun point d'accès Finances pour cet utilisateur CIRIL");
          }, db);
        } catch (e) {
          echec = e;
        }
      });

      test("Then l'erreur remonte à l'appelant", () => {
        expect(echec).toBeInstanceOf(Error);
      });

      test("Then l'échec est enregistré avec son motif, pour qu'une panne se voie", async () => {
        const [ligne] = await db.select().from(schema.synchronisations);

        expect([ligne?.resultat, ligne?.erreur]).toEqual([
          "echec",
          "Aucun point d'accès Finances pour cet utilisateur CIRIL",
        ]);
      });
    });
  });
});
