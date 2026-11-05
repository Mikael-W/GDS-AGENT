import { creerBase, schema } from "@projet/db";
import { asc } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { ErreurCiril } from "@/server/utils/ciril";
import { journaliser } from "@/server/utils/synchronisations";

const url = process.env.TEST_DATABASE_URL;

const bilan = { recus: 3, inseres: 1, misAJour: 1 };

describe.skipIf(!url)("journal des synchronisations avec CIRIL", () => {
  const db = creerBase(url ?? "", 1);

  const lignes = () =>
    db.select().from(schema.synchronisations).orderBy(asc(schema.synchronisations.id));

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });
  afterAll(() => db.$client.end());

  describe("Given une lecture de CIRIL qui ramène trois marchés dont un nouveau et un modifié", () => {
    describe("When la synchronisation se termine bien", () => {
      let pendantLaLecture: string | undefined;

      beforeAll(async () => {
        await db.delete(schema.synchronisations);
        await journaliser(async () => {
          pendantLaLecture = (await lignes())[0]?.resultat;
          return bilan;
        }, db);
      });

      test("Then elle est visible comme en cours pendant la lecture", () => {
        expect(pendantLaLecture).toBe("en_cours");
      });

      test("Then elle est ensuite enregistrée comme réussie, avec son heure de fin", async () => {
        const [ligne] = await lignes();

        expect(ligne?.resultat).toBe("succes");
        expect(ligne?.termineeLe).not.toBeNull();
      });

      test("Then elle compte trois marchés lus et deux modifiés", async () => {
        const [ligne] = await lignes();

        expect([ligne?.marchesLus, ligne?.marchesModifies]).toEqual([3, 2]);
      });
    });
  });

  describe("Given une lecture de CIRIL qui échoue faute d'accès", () => {
    describe("When la synchronisation s'arrête", () => {
      const refus = new Error("Aucun point d'accès Finances pour cet utilisateur CIRIL");
      let remontee: unknown;

      beforeAll(async () => {
        await db.delete(schema.synchronisations);
        remontee = await journaliser(async () => {
          throw refus;
        }, db).catch((e) => e);
      });

      test("Then c'est cette même erreur qui remonte à l'appelant", () => {
        expect(remontee).toBe(refus);
      });

      test("Then l'échec est enregistré comme tel, avec son heure de fin", async () => {
        const [ligne] = await lignes();

        expect(ligne?.resultat).toBe("echec");
        expect(ligne?.termineeLe).not.toBeNull();
      });

      test("Then son motif est enregistré pour qu'une panne se voie", async () => {
        const [ligne] = await lignes();

        expect(ligne?.erreur).toBe("Aucun point d'accès Finances pour cet utilisateur CIRIL");
      });
    });
  });

  describe("Given une panne signalée par autre chose qu'une erreur", () => {
    describe("When la synchronisation s'arrête", () => {
      beforeAll(async () => {
        await db.delete(schema.synchronisations);
        await journaliser(async () => {
          throw "connexion interrompue";
        }, db).catch(() => undefined);
      });

      test("Then le texte de la panne est enregistré comme motif", async () => {
        const [ligne] = await lignes();

        expect(ligne?.erreur).toBe("connexion interrompue");
      });
    });
  });

  describe("Given une réponse d'erreur de CIRIL qui répète le mot de passe du compte", () => {
    describe("When la synchronisation s'arrête", () => {
      beforeAll(async () => {
        await db.delete(schema.synchronisations);
        await journaliser(async () => {
          throw new ErreurCiril(
            "CIRIL getAccessList 401 : Accès refusé <Password>Secret!2026</Password> pour AISISTERS",
          );
        }, db).catch(() => undefined);
      });

      test("Then seul le statut de la réponse est enregistré, sans le corps", async () => {
        const [ligne] = await lignes();

        expect(ligne?.erreur).toBe("CIRIL getAccessList 401");
      });
    });
  });

  describe("Given une synchronisation réussie suivie d'une synchronisation en panne", () => {
    describe("When on relit le journal", () => {
      beforeAll(async () => {
        await db.delete(schema.synchronisations);
        await journaliser(async () => bilan, db);
        await journaliser(async () => {
          throw new Error("CIRIL injoignable");
        }, db).catch(() => undefined);
      });

      test("Then les deux passages sont conservés dans l'ordre", async () => {
        const resultats = (await lignes()).map((l) => l.resultat);

        expect(resultats).toEqual(["succes", "echec"]);
      });
    });
  });
});
