import { pgEnum, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Rôle d'un compte, recopié de Keycloak à chaque connexion : Keycloak fait
 * foi, l'application n'a pas d'écran de rôles. `owner` : l'équipe AI Sisters,
 * entrée par son fournisseur (`identity_provider` = `aisisters` dans le jeton) ;
 * `membre` : tout autre compte du realm du client.
 */
export const roles = pgEnum("role", ["membre", "owner"]);
export type Role = (typeof roles.enumValues)[number];

/**
 * Un compte, désigné par le `sub` de son jeton Keycloak (jamais par l'email :
 * une boîte peut être réattribuée). Toute modification du schéma passe par
 * `make migration NOM=<nom>`, qui écrit la migration dans packages/db/drizzle/.
 */
export const utilisateurs = pgTable("utilisateurs", {
  id: serial("id").primaryKey(),
  sub: varchar("sub", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  nom: varchar("nom", { length: 200 }),
  role: roles("role").notNull().default("membre"),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  vuLe: timestamp("vu_le", { withTimezone: true }).notNull().defaultNow(),
});

export type Utilisateur = typeof utilisateurs.$inferSelect;

/**
 * Dernier signe de vie de chaque service de fond, écrit par le worker (tâche
 * planifiée `maintenance.battement`) et lu par /health/ready : un
 * planificateur arrêté se voit au lieu de passer inaperçu.
 */
export const battements = pgTable("battements", {
  service: varchar("service", { length: 64 }).primaryKey(),
  vuLe: timestamp("vu_le", { withTimezone: true }).notNull().defaultNow(),
});
