import { createDatabase, schema } from "@projet/db";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { alertDetail, listAlerts, listDeadlines, treatAlert } from "@/server/utils/alerts";

const url = process.env.TEST_DATABASE_URL;

const EMPREINTE = "0".repeat(64);

describe.skipIf(!url)("alertes d'échéance lues dans la base de l'agent", () => {
  const db = createDatabase(url ?? "", 1);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });
  afterAll(() => db.$client.end());

  describe("Given un marché à bons de commande dont le dernier bon date de 100 jours", () => {
    beforeAll(async () => {
      await db.delete(schema.commitments);
      await db.delete(schema.contracts);
      const [contract] = await db
        .insert(schema.contracts)
        .values({
          reference: "AO 24034",
          subject: "Travaux sur le réseau d'eau potable",
          service: "Pôle eau",
          hasPurchaseOrders: true,
          startsOn: "2026-06-01",
          fingerprint: EMPREINTE,
        })
        .returning();
      await db.insert(schema.commitments).values([
        {
          contractId: contract?.id ?? 0,
          reference: "EJ 1",
          issuedOn: "2026-06-01",
          fingerprint: EMPREINTE,
        },
        {
          contractId: contract?.id ?? 0,
          reference: "EJ 2",
          issuedOn: "2026-07-27",
          fingerprint: EMPREINTE,
        },
      ]);
    });

    describe("When on liste les alertes au 4 novembre 2026", () => {
      test("Then le bon de commande le plus récent fait foi et l'alerte est dépassée", async () => {
        const alerts = await listAlerts("2026-11-04", db);

        expect(alerts.map((a) => [a.family, a.reference, a.daysRemaining])).toEqual([
          ["sans_bon_de_commande", "AO 24034", -10],
        ]);
      });

      test("Then l'alerte porte l'objet et le service du marché", async () => {
        const alerts = await listAlerts("2026-11-04", db);

        expect(alerts[0]).toMatchObject({
          subject: "Travaux sur le réseau d'eau potable",
          service: "Pôle eau",
        });
      });
    });
  });

  describe("Given deux marchés à échéance, l'un sans objet ni service, l'autre complet", () => {
    beforeAll(async () => {
      await db.delete(schema.commitments);
      await db.delete(schema.contracts);
      await db.insert(schema.contracts).values([
        { reference: "MA 24007", endsOn: "2026-11-20", fingerprint: EMPREINTE },
        {
          reference: "MA 24036",
          subject: "Travaux de génie civil, station de relevage",
          service: "Travaux",
          endsOn: "2026-11-25",
          fingerprint: EMPREINTE,
        },
      ]);
    });

    describe("When on liste les alertes au 4 novembre 2026", () => {
      test("Then chaque alerte garde l'objet et le service de son propre marché", async () => {
        const alerts = await listAlerts("2026-11-04", db);

        expect(alerts.map((a) => [a.reference, a.subject, a.service])).toEqual([
          ["MA 24007", null, null],
          ["MA 24036", "Travaux de génie civil, station de relevage", "Travaux"],
        ]);
      });
    });
  });

  describe("Given un marché soldé dont la date de fin approche", () => {
    beforeAll(async () => {
      await db.delete(schema.commitments);
      await db.delete(schema.contracts);
      await db.insert(schema.contracts).values({
        reference: "MA 24007",
        settled: true,
        endsOn: "2026-11-20",
        fingerprint: EMPREINTE,
      });
    });

    describe("When on liste les alertes", () => {
      test("Then aucune alerte n'est produite pour ce marché", async () => {
        const alerts = await listAlerts("2026-11-04", db);

        expect(alerts).toEqual([]);
      });
    });
  });

  describe("Given l'alerte de reconduction tacite du marché AO 25075", () => {
    const saisie = {
      reference: "AO 25075",
      family: "reconduction",
      comment: "Reconduction acceptée avec le titulaire, décision de la direction.",
      treatedBy: "a1b2c3",
    } as const;

    async function prepareContract(fields: Partial<typeof schema.contracts.$inferInsert> = {}) {
      await db.delete(schema.commitments);
      await db.delete(schema.contracts);
      await db.insert(schema.contracts).values({
        reference: "AO 25075",
        subject: "Entretien des espaces verts et des abords",
        service: "Espaces verts",
        holder: "Titulaire C",
        tacitRenewal: true,
        endsOn: "2027-03-04",
        fingerprint: EMPREINTE,
        ...fields,
      });
    }

    describe("When personne ne l'a encore traitée", () => {
      beforeAll(() => prepareContract());

      test("Then elle figure dans la liste des alertes à traiter", async () => {
        const alerts = await listAlerts("2026-11-04", db);

        expect(alerts.map((a) => [a.reference, a.family])).toEqual([["AO 25075", "reconduction"]]);
      });

      test("Then son détail ne porte pas encore de traitement", async () => {
        const details = await alertDetail("AO 25075", "reconduction", "2026-11-04", db);

        expect(details?.treatment).toBeNull();
      });
    });

    describe("When un agent la marque comme traitée", () => {
      let issue: Awaited<ReturnType<typeof treatAlert>>;

      beforeAll(async () => {
        await prepareContract();
        issue = await treatAlert(saisie, "2026-11-04", db);
      });

      test("Then le traitement est enregistré", () => {
        expect(issue).toBe("traitee");
      });

      test("Then elle n'est plus dans la liste le lendemain", async () => {
        const alerts = await listAlerts("2026-11-05", db);

        expect(alerts).toEqual([]);
      });

      test("Then son détail garde le commentaire de la décision", async () => {
        const details = await alertDetail("AO 25075", "reconduction", "2026-11-05", db);

        expect(details?.treatment?.comment).toBe(saisie.comment);
      });
    });

    describe("When un collègue veut la traiter après le premier agent", () => {
      let issue: Awaited<ReturnType<typeof treatAlert>>;

      beforeAll(async () => {
        await prepareContract();
        await treatAlert(saisie, "2026-11-04", db);
        issue = await treatAlert(
          { ...saisie, comment: "Décision différente.", treatedBy: "d4e5f6" },
          "2026-11-04",
          db,
        );
      });

      test("Then on lui dit que l'alerte est déjà traitée", () => {
        expect(issue).toBe("deja_traitee");
      });

      test("Then la décision du premier agent est conservée", async () => {
        const treatments = await db.select().from(schema.alertTreatments);

        expect(treatments.map((t) => t.comment)).toEqual([saisie.comment]);
      });
    });

    describe("When la date de fin du marché change après le traitement", () => {
      beforeAll(async () => {
        await prepareContract();
        await treatAlert(saisie, "2026-11-04", db);
        await db
          .update(schema.contracts)
          .set({ endsOn: "2027-06-04" })
          .where(eq(schema.contracts.reference, "AO 25075"));
      });

      test("Then une nouvelle alerte apparaît pour la nouvelle échéance", async () => {
        const alerts = await listAlerts("2027-02-10", db);

        expect(alerts.map((a) => [a.family, a.deadlineOn])).toEqual([
          ["reconduction", "2027-02-04"],
        ]);
      });

      test("Then le détail de la nouvelle échéance n'est pas traité", async () => {
        const details = await alertDetail("AO 25075", "reconduction", "2027-02-10", db);

        expect(details?.treatment).toBeNull();
      });
    });

    describe("When on consulte l'échéancier en novembre 2026", () => {
      let deadlines: Awaited<ReturnType<typeof listDeadlines>>;

      beforeAll(async () => {
        await prepareContract({ endsOn: "2027-06-04" });
        deadlines = await listDeadlines("2026-11-04", db);
      });

      test("Then la reconduction de février apparaît, avant même que l'alerte se déclenche", () => {
        expect(deadlines.map((a) => [a.family, a.deadlineOn])).toEqual([
          ["reconduction", "2027-02-04"],
        ]);
      });

      test("Then elle porte l'objet et le service du marché", () => {
        expect(deadlines[0]).toMatchObject({
          subject: "Entretien des espaces verts et des abords",
          service: "Espaces verts",
        });
      });
    });

    describe("When une échéance de l'échéancier a déjà été traitée", () => {
      let deadlines: Awaited<ReturnType<typeof listDeadlines>>;

      beforeAll(async () => {
        await prepareContract();
        await treatAlert(saisie, "2026-11-04", db);
        deadlines = await listDeadlines("2026-11-05", db);
      });

      test("Then la reconduction traitée n'y figure plus", () => {
        expect(deadlines.map((a) => a.family)).not.toContain("reconduction");
      });
    });

    describe("When on cherche une alerte de garantie que le marché ne déclenche pas", () => {
      let details: Awaited<ReturnType<typeof alertDetail>>;
      let issue: Awaited<ReturnType<typeof treatAlert>>;

      beforeAll(async () => {
        await prepareContract();
        details = await alertDetail("AO 25075", "garantie", "2026-11-04", db);
        issue = await treatAlert({ ...saisie, family: "garantie" }, "2026-11-04", db);
      });

      test("Then aucun détail n'existe", () => {
        expect(details).toBeUndefined();
      });

      test("Then rien ne peut être traité", () => {
        expect(issue).toBe("inconnue");
      });
    });

    describe("When le marché est soldé alors que sa reconduction approche", () => {
      let issue: Awaited<ReturnType<typeof treatAlert>>;

      beforeAll(async () => {
        await prepareContract({ settled: true });
        issue = await treatAlert(saisie, "2026-11-04", db);
      });

      test("Then l'alerte n'est plus traitable", () => {
        expect(issue).toBe("inconnue");
      });
    });
  });
});
