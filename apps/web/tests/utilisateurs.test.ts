import { creerBase, schema } from "@projet/db";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enregistrer, renommer, trouver } from "@/lib/utilisateurs";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("comptes (base PostgreSQL)", () => {
  const db = creerBase(url ?? "", 1);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
    await db.delete(schema.utilisateurs);
  });
  afterAll(() => db.$client.end());

  it("enregistre un compte par son sub, une seule fois", async () => {
    const premier = await enregistrer(
      { sub: "sub-1", email: "camille@exemple.test", nom: "Camille" },
      db,
    );
    const second = await enregistrer({ sub: "sub-1", email: "camille@exemple.test" }, db);
    expect(second.id).toBe(premier.id);
    expect(second.nom).toBe("Camille");
  });

  it("ne donne pas l'ancien compte à une boîte réattribuée", async () => {
    await enregistrer({ sub: "ancien", email: "boite@exemple.test" }, db);
    const nouveau = await enregistrer({ sub: "nouveau", email: "boite@exemple.test" }, db);
    expect(nouveau.sub).toBe("nouveau");
  });

  it("renomme le compte", async () => {
    await renommer("sub-1", "Camille Martin", db);
    expect((await trouver("sub-1", db))?.nom).toBe("Camille Martin");
  });

  it("recopie le rôle de Keycloak à chaque connexion, y compris un retrait", async () => {
    await enregistrer({ sub: "sub-role", role: "owner" }, db);
    expect((await trouver("sub-role", db))?.role).toBe("owner");
    await enregistrer({ sub: "sub-role", role: "membre" }, db);
    expect((await trouver("sub-role", db))?.role).toBe("membre");
  });
});
