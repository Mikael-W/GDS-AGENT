import { creerBase, schema } from "@projet/db";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { detailAlerte, listerAlertes, traiterAlerte } from "@/server/utils/alertes";

const url = process.env.TEST_DATABASE_URL;

const EMPREINTE = "0".repeat(64);

describe.skipIf(!url)("alertes d'échéance lues dans la base de l'agent", () => {
  const db = creerBase(url ?? "", 1);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });
  afterAll(() => db.$client.end());

  describe("Given un marché à bons de commande dont le dernier bon date de 100 jours", () => {
    beforeAll(async () => {
      await db.delete(schema.engagements);
      await db.delete(schema.marches);
      const [marche] = await db
        .insert(schema.marches)
        .values({
          reference: "AO 24034",
          objet: "Travaux sur le réseau d'eau potable",
          service: "Pôle eau",
          aBonsDeCommande: true,
          debuteLe: "2026-06-01",
          empreinte: EMPREINTE,
        })
        .returning();
      await db.insert(schema.engagements).values([
        {
          marcheId: marche?.id ?? 0,
          reference: "EJ 1",
          emisLe: "2026-06-01",
          empreinte: EMPREINTE,
        },
        {
          marcheId: marche?.id ?? 0,
          reference: "EJ 2",
          emisLe: "2026-07-27",
          empreinte: EMPREINTE,
        },
      ]);
    });

    describe("When on liste les alertes au 4 novembre 2026", () => {
      test("Then le bon de commande le plus récent fait foi et l'alerte est dépassée", async () => {
        const alertes = await listerAlertes("2026-11-04", db);

        expect(alertes.map((a) => [a.famille, a.reference, a.joursRestants])).toEqual([
          ["sans_bon_de_commande", "AO 24034", -10],
        ]);
      });

      test("Then l'alerte porte l'objet et le service du marché", async () => {
        const alertes = await listerAlertes("2026-11-04", db);

        expect(alertes[0]).toMatchObject({
          objet: "Travaux sur le réseau d'eau potable",
          service: "Pôle eau",
        });
      });
    });
  });

  describe("Given deux marchés à échéance, l'un sans objet ni service, l'autre complet", () => {
    beforeAll(async () => {
      await db.delete(schema.engagements);
      await db.delete(schema.marches);
      await db.insert(schema.marches).values([
        { reference: "MA 24007", finitLe: "2026-11-20", empreinte: EMPREINTE },
        {
          reference: "MA 24036",
          objet: "Travaux de génie civil, station de relevage",
          service: "Travaux",
          finitLe: "2026-11-25",
          empreinte: EMPREINTE,
        },
      ]);
    });

    describe("When on liste les alertes au 4 novembre 2026", () => {
      test("Then chaque alerte garde l'objet et le service de son propre marché", async () => {
        const alertes = await listerAlertes("2026-11-04", db);

        expect(alertes.map((a) => [a.reference, a.objet, a.service])).toEqual([
          ["MA 24007", null, null],
          ["MA 24036", "Travaux de génie civil, station de relevage", "Travaux"],
        ]);
      });
    });
  });

  describe("Given un marché soldé dont la date de fin approche", () => {
    beforeAll(async () => {
      await db.delete(schema.engagements);
      await db.delete(schema.marches);
      await db.insert(schema.marches).values({
        reference: "MA 24007",
        solde: true,
        finitLe: "2026-11-20",
        empreinte: EMPREINTE,
      });
    });

    describe("When on liste les alertes", () => {
      test("Then aucune alerte n'est produite pour ce marché", async () => {
        const alertes = await listerAlertes("2026-11-04", db);

        expect(alertes).toEqual([]);
      });
    });
  });

  describe("Given l'alerte de reconduction tacite du marché AO 25075", () => {
    const saisie = {
      reference: "AO 25075",
      famille: "reconduction",
      commentaire: "Reconduction acceptée avec le titulaire, décision de la direction.",
      traitePar: "a1b2c3",
    } as const;

    async function preparerMarche(champs: Partial<typeof schema.marches.$inferInsert> = {}) {
      await db.delete(schema.engagements);
      await db.delete(schema.marches);
      await db.insert(schema.marches).values({
        reference: "AO 25075",
        objet: "Entretien des espaces verts et des abords",
        service: "Espaces verts",
        titulaire: "Titulaire C",
        reconductionTacite: true,
        finitLe: "2027-03-04",
        empreinte: EMPREINTE,
        ...champs,
      });
    }

    describe("When personne ne l'a encore traitée", () => {
      beforeAll(() => preparerMarche());

      test("Then elle figure dans la liste des alertes à traiter", async () => {
        const alertes = await listerAlertes("2026-11-04", db);

        expect(alertes.map((a) => [a.reference, a.famille])).toEqual([
          ["AO 25075", "reconduction"],
        ]);
      });

      test("Then son détail ne porte pas encore de traitement", async () => {
        const detail = await detailAlerte("AO 25075", "reconduction", "2026-11-04", db);

        expect(detail?.traitement).toBeNull();
      });
    });

    describe("When un agent la marque comme traitée", () => {
      let issue: Awaited<ReturnType<typeof traiterAlerte>>;

      beforeAll(async () => {
        await preparerMarche();
        issue = await traiterAlerte(saisie, "2026-11-04", db);
      });

      test("Then le traitement est enregistré", () => {
        expect(issue).toBe("traitee");
      });

      test("Then elle n'est plus dans la liste le lendemain", async () => {
        const alertes = await listerAlertes("2026-11-05", db);

        expect(alertes).toEqual([]);
      });

      test("Then son détail garde le commentaire de la décision", async () => {
        const detail = await detailAlerte("AO 25075", "reconduction", "2026-11-05", db);

        expect(detail?.traitement?.commentaire).toBe(saisie.commentaire);
      });
    });

    describe("When un collègue veut la traiter après le premier agent", () => {
      let issue: Awaited<ReturnType<typeof traiterAlerte>>;

      beforeAll(async () => {
        await preparerMarche();
        await traiterAlerte(saisie, "2026-11-04", db);
        issue = await traiterAlerte(
          { ...saisie, commentaire: "Décision différente.", traitePar: "d4e5f6" },
          "2026-11-04",
          db,
        );
      });

      test("Then on lui dit que l'alerte est déjà traitée", () => {
        expect(issue).toBe("deja_traitee");
      });

      test("Then la décision du premier agent est conservée", async () => {
        const traitements = await db.select().from(schema.traitementsAlertes);

        expect(traitements.map((t) => t.commentaire)).toEqual([saisie.commentaire]);
      });
    });

    describe("When la date de fin du marché change après le traitement", () => {
      beforeAll(async () => {
        await preparerMarche();
        await traiterAlerte(saisie, "2026-11-04", db);
        await db
          .update(schema.marches)
          .set({ finitLe: "2027-06-04" })
          .where(eq(schema.marches.reference, "AO 25075"));
      });

      test("Then une nouvelle alerte apparaît pour la nouvelle échéance", async () => {
        const alertes = await listerAlertes("2027-02-10", db);

        expect(alertes.map((a) => [a.famille, a.echeanceLe])).toEqual([
          ["reconduction", "2027-02-04"],
        ]);
      });

      test("Then le détail de la nouvelle échéance n'est pas traité", async () => {
        const detail = await detailAlerte("AO 25075", "reconduction", "2027-02-10", db);

        expect(detail?.traitement).toBeNull();
      });
    });

    describe("When on cherche une alerte de garantie que le marché ne déclenche pas", () => {
      let detail: Awaited<ReturnType<typeof detailAlerte>>;
      let issue: Awaited<ReturnType<typeof traiterAlerte>>;

      beforeAll(async () => {
        await preparerMarche();
        detail = await detailAlerte("AO 25075", "garantie", "2026-11-04", db);
        issue = await traiterAlerte({ ...saisie, famille: "garantie" }, "2026-11-04", db);
      });

      test("Then aucun détail n'existe", () => {
        expect(detail).toBeUndefined();
      });

      test("Then rien ne peut être traité", () => {
        expect(issue).toBe("inconnue");
      });
    });

    describe("When le marché est soldé alors que sa reconduction approche", () => {
      let issue: Awaited<ReturnType<typeof traiterAlerte>>;

      beforeAll(async () => {
        await preparerMarche({ solde: true });
        issue = await traiterAlerte(saisie, "2026-11-04", db);
      });

      test("Then l'alerte n'est plus traitable", () => {
        expect(issue).toBe("inconnue");
      });
    });
  });
});
