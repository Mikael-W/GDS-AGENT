/**
 * Applique les migrations en attente (drizzle/), puis s'arrête.
 * En production : service `migrations` du compose, avant le web ; un échec
 * bloque la mise en service et le déploiement revient en arrière.
 * Compilé en dist/migrer.mjs par `pnpm build` (aucun outil de dev dans l'image),
 * copié avec drizzle/ dans l'image du web.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL absente");

const connexion = postgres(url, { max: 1 });
await migrate(drizzle(connexion), {
  migrationsFolder: process.env.DOSSIER_MIGRATIONS ?? "drizzle",
});
await connexion.end();
console.log("Migrations appliquées");
