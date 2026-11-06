import { createDatabase, schema } from "@projet/db";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { findBySub, rename, upsertUser } from "@/server/utils/users";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("comptes (base PostgreSQL)", () => {
  const db = createDatabase(url ?? "", 1);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
    await db.delete(schema.users);
  });
  afterAll(() => db.$client.end());

  it("records an account by its sub, only once", async () => {
    const first = await upsertUser(
      { sub: "sub-1", email: "camille@exemple.test", name: "Camille" },
      db,
    );
    const second = await upsertUser({ sub: "sub-1", email: "camille@exemple.test" }, db);
    expect(second.id).toBe(first.id);
    expect(second.name).toBe("Camille");
  });

  it("does not give the old account to a reassigned mailbox", async () => {
    await upsertUser({ sub: "ancien", email: "boite@exemple.test" }, db);
    const created = await upsertUser({ sub: "nouveau", email: "boite@exemple.test" }, db);
    expect(created.sub).toBe("nouveau");
  });

  it("renames the account", async () => {
    await rename("sub-1", "Camille Martin", db);
    expect((await findBySub("sub-1", db))?.name).toBe("Camille Martin");
  });

  it("copies the Keycloak role at each login, including a removal", async () => {
    await upsertUser({ sub: "sub-role", role: "owner" }, db);
    expect((await findBySub("sub-role", db))?.role).toBe("owner");
    await upsertUser({ sub: "sub-role", role: "membre" }, db);
    expect((await findBySub("sub-role", db))?.role).toBe("membre");
  });
});
