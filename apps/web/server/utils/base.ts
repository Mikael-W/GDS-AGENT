import { type Base, creerBase } from "@projet/db";

import { env } from "./env";

let memo: Base | undefined;

export function base(): Base {
  memo ??= creerBase(env().DATABASE_URL);
  return memo;
}
