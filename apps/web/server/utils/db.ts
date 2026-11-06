import { createDatabase, type Database } from "@projet/db";

import { env } from "./env";

let memo: Database | undefined;

export function getDb(): Database {
  memo ??= createDatabase(env().DATABASE_URL);
  return memo;
}
