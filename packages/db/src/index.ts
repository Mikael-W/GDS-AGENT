import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export * as schema from "./schema";

/**
 * Accès à la base, partagé par le web et le worker : chaque
 * application crée sa connexion avec sa propre URL, lue dans son
 * environnement validé.
 */
export type Base = ReturnType<typeof drizzle<typeof schema>>;

export function creerBase(url: string, connexionsMax = 10): Base {
  return drizzle(postgres(url, { max: connexionsMax }), { schema });
}
