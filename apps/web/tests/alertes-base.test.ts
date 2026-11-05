import { creerBase, schema } from "@projet/db";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { listerAlertes } from "@/server/utils/alertes";

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
});
