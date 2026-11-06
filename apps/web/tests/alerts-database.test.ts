import { createDatabase, schema } from "@projet/db";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { alertDetail, listAlerts, listDeadlines, treatAlert } from "@/server/utils/alerts";

const url = process.env.TEST_DATABASE_URL;

const FINGERPRINT = "0".repeat(64);

describe.skipIf(!url)("alertes d'échéance lues dans la base de l'agent", () => {
  const db = createDatabase(url ?? "", 1);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });
  afterAll(() => db.$client.end());

  describe("Given a purchase-order contract whose last order is 100 days old", () => {
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
          fingerprint: FINGERPRINT,
        })
        .returning();
      await db.insert(schema.commitments).values([
        {
          contractId: contract?.id ?? 0,
          reference: "EJ 1",
          issuedOn: "2026-06-01",
          fingerprint: FINGERPRINT,
        },
        {
          contractId: contract?.id ?? 0,
          reference: "EJ 2",
          issuedOn: "2026-07-27",
          fingerprint: FINGERPRINT,
        },
      ]);
    });

    describe("When alerts are listed on 4 November 2026", () => {
      test("Then the most recent purchase order prevails and the alert is overdue", async () => {
        const alerts = await listAlerts("2026-11-04", db);

        expect(alerts.map((a) => [a.family, a.reference, a.daysRemaining])).toEqual([
          ["sans_bon_de_commande", "AO 24034", -10],
        ]);
      });

      test("Then the alert carries the contract subject and department", async () => {
        const alerts = await listAlerts("2026-11-04", db);

        expect(alerts[0]).toMatchObject({
          subject: "Travaux sur le réseau d'eau potable",
          service: "Pôle eau",
        });
      });
    });
  });

  describe("Given two contracts with deadlines, one without subject or department, the other complete", () => {
    beforeAll(async () => {
      await db.delete(schema.commitments);
      await db.delete(schema.contracts);
      await db.insert(schema.contracts).values([
        { reference: "MA 24007", endsOn: "2026-11-20", fingerprint: FINGERPRINT },
        {
          reference: "MA 24036",
          subject: "Travaux de génie civil, station de relevage",
          service: "Travaux",
          endsOn: "2026-11-25",
          fingerprint: FINGERPRINT,
        },
      ]);
    });

    describe("When alerts are listed on 4 November 2026", () => {
      test("Then each alert keeps the subject and department of its own contract", async () => {
        const alerts = await listAlerts("2026-11-04", db);

        expect(alerts.map((a) => [a.reference, a.subject, a.service])).toEqual([
          ["MA 24007", null, null],
          ["MA 24036", "Travaux de génie civil, station de relevage", "Travaux"],
        ]);
      });
    });
  });

  describe("Given a settled contract whose end date is approaching", () => {
    beforeAll(async () => {
      await db.delete(schema.commitments);
      await db.delete(schema.contracts);
      await db.insert(schema.contracts).values({
        reference: "MA 24007",
        settled: true,
        endsOn: "2026-11-20",
        fingerprint: FINGERPRINT,
      });
    });

    describe("When alerts are listed", () => {
      test("Then no alert is produced for this contract", async () => {
        const alerts = await listAlerts("2026-11-04", db);

        expect(alerts).toEqual([]);
      });
    });
  });

  describe("Given the tacit renewal alert of contract AO 25075", () => {
    const input = {
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
        fingerprint: FINGERPRINT,
        ...fields,
      });
    }

    describe("When nobody has treated it yet", () => {
      beforeAll(() => prepareContract());

      test("Then it appears in the list of alerts to treat", async () => {
        const alerts = await listAlerts("2026-11-04", db);

        expect(alerts.map((a) => [a.reference, a.family])).toEqual([["AO 25075", "reconduction"]]);
      });

      test("Then its detail carries no treatment yet", async () => {
        const details = await alertDetail("AO 25075", "reconduction", "2026-11-04", db);

        expect(details?.treatment).toBeNull();
      });
    });

    describe("When an agent marks it as treated", () => {
      let issue: Awaited<ReturnType<typeof treatAlert>>;

      beforeAll(async () => {
        await prepareContract();
        issue = await treatAlert(input, "2026-11-04", db);
      });

      test("Then the treatment is recorded", () => {
        expect(issue).toBe("traitee");
      });

      test("Then it is no longer in the list the next day", async () => {
        const alerts = await listAlerts("2026-11-05", db);

        expect(alerts).toEqual([]);
      });

      test("Then its detail keeps the decision comment", async () => {
        const details = await alertDetail("AO 25075", "reconduction", "2026-11-05", db);

        expect(details?.treatment?.comment).toBe(input.comment);
      });
    });

    describe("When a colleague wants to treat it after the first agent", () => {
      let issue: Awaited<ReturnType<typeof treatAlert>>;

      beforeAll(async () => {
        await prepareContract();
        await treatAlert(input, "2026-11-04", db);
        issue = await treatAlert(
          { ...input, comment: "Décision différente.", treatedBy: "d4e5f6" },
          "2026-11-04",
          db,
        );
      });

      test("Then they are told the alert is already treated", () => {
        expect(issue).toBe("deja_traitee");
      });

      test("Then the first agent's decision is kept", async () => {
        const treatments = await db.select().from(schema.alertTreatments);

        expect(treatments.map((t) => t.comment)).toEqual([input.comment]);
      });
    });

    describe("When the contract end date changes after the treatment", () => {
      beforeAll(async () => {
        await prepareContract();
        await treatAlert(input, "2026-11-04", db);
        await db
          .update(schema.contracts)
          .set({ endsOn: "2027-06-04" })
          .where(eq(schema.contracts.reference, "AO 25075"));
      });

      test("Then a new alert appears for the new deadline", async () => {
        const alerts = await listAlerts("2027-02-10", db);

        expect(alerts.map((a) => [a.family, a.deadlineOn])).toEqual([
          ["reconduction", "2027-02-04"],
        ]);
      });

      test("Then the detail of the new deadline is not treated", async () => {
        const details = await alertDetail("AO 25075", "reconduction", "2027-02-10", db);

        expect(details?.treatment).toBeNull();
      });
    });

    describe("When the schedule is consulted in November 2026", () => {
      let deadlines: Awaited<ReturnType<typeof listDeadlines>>;

      beforeAll(async () => {
        await prepareContract({ endsOn: "2027-06-04" });
        deadlines = await listDeadlines("2026-11-04", db);
      });

      test("Then the February reconduction appears, even before the alert triggers", () => {
        expect(deadlines.map((a) => [a.family, a.deadlineOn])).toEqual([
          ["reconduction", "2027-02-04"],
        ]);
      });

      test("Then it carries the contract subject and department", () => {
        expect(deadlines[0]).toMatchObject({
          subject: "Entretien des espaces verts et des abords",
          service: "Espaces verts",
        });
      });
    });

    describe("When a schedule deadline has already been treated", () => {
      let deadlines: Awaited<ReturnType<typeof listDeadlines>>;

      beforeAll(async () => {
        await prepareContract();
        await treatAlert(input, "2026-11-04", db);
        deadlines = await listDeadlines("2026-11-05", db);
      });

      test("Then the treated reconduction no longer appears in it", () => {
        expect(deadlines.map((a) => a.family)).not.toContain("reconduction");
      });
    });

    describe("When looking for a guarantee alert that the contract does not trigger", () => {
      let details: Awaited<ReturnType<typeof alertDetail>>;
      let issue: Awaited<ReturnType<typeof treatAlert>>;

      beforeAll(async () => {
        await prepareContract();
        details = await alertDetail("AO 25075", "garantie", "2026-11-04", db);
        issue = await treatAlert({ ...input, family: "garantie" }, "2026-11-04", db);
      });

      test("Then no detail exists", () => {
        expect(details).toBeUndefined();
      });

      test("Then nothing can be treated", () => {
        expect(issue).toBe("inconnue");
      });
    });

    describe("When the contract is settled while its reconduction is approaching", () => {
      let issue: Awaited<ReturnType<typeof treatAlert>>;

      beforeAll(async () => {
        await prepareContract({ settled: true });
        issue = await treatAlert(input, "2026-11-04", db);
      });

      test("Then the alert can no longer be treated", () => {
        expect(issue).toBe("inconnue");
      });
    });
  });
});
