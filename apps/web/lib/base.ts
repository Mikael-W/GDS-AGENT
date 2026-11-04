import "server-only";

import { type Base, creerBase } from "@projet/db";

import { env } from "@/lib/env";

let memo: Base | undefined;

/** Connexion du web, créée au premier usage avec l'URL de l'environnement validé. */
export function base(): Base {
  memo ??= creerBase(env().DATABASE_URL);
  return memo;
}
