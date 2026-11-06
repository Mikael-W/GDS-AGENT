import { createDatabase, schema } from "@projet/db";
import { asc } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { CirilError } from "@/server/utils/ciril";
import { journal } from "@/server/utils/synchronizations";

const url = process.env.TEST_DATABASE_URL;

const bilan = { received: 3, inserted: 1, updated: 1 };

describe.skipIf(!url)("journal des synchronisations avec CIRIL", () => {
  const db = createDatabase(url ?? "", 1);

  const rows = () =>
    db.select().from(schema.synchronizations).orderBy(asc(schema.synchronizations.id));

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });
  afterAll(() => db.$client.end());

  describe("Given une lecture de CIRIL qui ramène trois marchés dont un nouveau et un modifié", () => {
    describe("When la synchronisation se termine bien", () => {
      let pendantLaLecture: string | undefined;

      beforeAll(async () => {
        await db.delete(schema.synchronizations);
        await journal(async () => {
          pendantLaLecture = (await rows())[0]?.resultat;
          return bilan;
        }, db);
      });

      test("Then elle est visible comme en cours pendant la lecture", () => {
        expect(pendantLaLecture).toBe("en_cours");
      });

      test("Then elle est ensuite enregistrée comme réussie, avec son heure de fin", async () => {
        const [row] = await rows();

        expect(row?.resultat).toBe("succes");
        expect(row?.finishedOn).not.toBeNull();
      });

      test("Then elle compte trois marchés lus et deux modifiés", async () => {
        const [row] = await rows();

        expect([row?.contractsRead, row?.contractsModified]).toEqual([3, 2]);
      });
    });
  });

  describe("Given une lecture de CIRIL qui échoue faute d'accès", () => {
    describe("When la synchronisation s'arrête", () => {
      const refus = new Error("Aucun point d'accès Finances pour cet utilisateur CIRIL");
      let remontee: unknown;

      beforeAll(async () => {
        await db.delete(schema.synchronizations);
        remontee = await journal(async () => {
          throw refus;
        }, db).catch((e) => e);
      });

      test("Then c'est cette même erreur qui remonte à l'appelant", () => {
        expect(remontee).toBe(refus);
      });

      test("Then l'échec est enregistré comme tel, avec son heure de fin", async () => {
        const [row] = await rows();

        expect(row?.resultat).toBe("echec");
        expect(row?.finishedOn).not.toBeNull();
      });

      test("Then son motif est enregistré pour qu'une panne se voie", async () => {
        const [row] = await rows();

        expect(row?.error).toBe("Aucun point d'accès Finances pour cet utilisateur CIRIL");
      });
    });
  });

  describe("Given une panne signalée par autre chose qu'une erreur", () => {
    describe("When la synchronisation s'arrête", () => {
      beforeAll(async () => {
        await db.delete(schema.synchronizations);
        await journal(async () => {
          throw "connexion interrompue";
        }, db).catch(() => undefined);
      });

      test("Then le texte de la panne est enregistré comme motif", async () => {
        const [row] = await rows();

        expect(row?.error).toBe("connexion interrompue");
      });
    });
  });

  describe("Given une réponse d'erreur de CIRIL qui répète le mot de passe du compte", () => {
    describe("When la synchronisation s'arrête", () => {
      beforeAll(async () => {
        await db.delete(schema.synchronizations);
        await journal(async () => {
          throw new CirilError(
            "CIRIL getAccessList 401 : Accès refusé <Password>Secret!2026</Password> pour AISISTERS",
          );
        }, db).catch(() => undefined);
      });

      test("Then seul le statut de la réponse est enregistré, sans le corps", async () => {
        const [row] = await rows();

        expect(row?.error).toBe("CIRIL getAccessList 401");
      });
    });
  });

  describe("Given une synchronisation réussie suivie d'une synchronisation en panne", () => {
    describe("When on relit le journal", () => {
      beforeAll(async () => {
        await db.delete(schema.synchronizations);
        await journal(async () => bilan, db);
        await journal(async () => {
          throw new Error("CIRIL injoignable");
        }, db).catch(() => undefined);
      });

      test("Then les deux passages sont conservés dans l'ordre", async () => {
        const resultats = (await rows()).map((l) => l.resultat);

        expect(resultats).toEqual(["succes", "echec"]);
      });
    });
  });
});
