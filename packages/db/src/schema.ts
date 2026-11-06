import {
  boolean,
  char,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

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
export const users = pgTable("utilisateurs", {
  id: serial("id").primaryKey(),
  sub: varchar("sub", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  name: varchar("nom", { length: 200 }),
  role: roles("role").notNull().default("membre"),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  seenAt: timestamp("vu_le", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

/**
 * Dernier signe de vie de chaque service de fond, écrit par le worker (tâche
 * planifiée `maintenance.battement`) et lu par /health/ready : un
 * planificateur arrêté se voit au lieu de passer inaperçu.
 */
export const heartbeats = pgTable("battements", {
  service: varchar("service", { length: 64 }).primaryKey(),
  seenAt: timestamp("vu_le", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Référentiel recopié de CIRIL, jamais écrit vers CIRIL : l'application lit,
 * calcule et propose, les équipes décident dans CIRIL. Les identifiants
 * d'origine (`reference`) viennent de CIRIL et font foi ; `empreinte` est le
 * condensé de la charge utile lue, qui sert à repérer ce qui a changé depuis
 * la veille, CIRIL n'exposant aucune date de dernière modification.
 */
export const contracts = pgTable(
  "marches",
  {
    id: serial("id").primaryKey(),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    subject: text("objet"),
    holder: varchar("titulaire", { length: 300 }),
    service: varchar("service", { length: 120 }),
    notifiedOn: date("notifie_le"),
    startsOn: date("debute_le"),
    endsOn: date("finit_le"),
    initialAmount: numeric("montant_initial", { precision: 14, scale: 2 }),
    amendmentsAmount: numeric("montant_avenants", { precision: 14, scale: 2 }),
    revisionsAmount: numeric("montant_revisions", { precision: 14, scale: 2 }),
    withholdingsAmount: numeric("montant_retenues", { precision: 14, scale: 2 }),
    availableAmount: numeric("montant_disponible", { precision: 14, scale: 2 }),
    tacitRenewal: boolean("reconduction_tacite"),
    maxRenewals: integer("reconductions_max"),
    // Alimentent les règles d'échéance (apps/web/lib/echeances.ts).
    hasPurchaseOrders: boolean("a_bons_de_commande").notNull().default(false),
    warrantyEndsOn: date("garantie_finit_le"),
    receivedOn: date("receptionne_le"),
    settled: boolean("solde").notNull().default(false),
    active: boolean("actif").notNull().default(true),
    fingerprint: char("empreinte", { length: 64 }).notNull(),
    readAt: timestamp("lu_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("marches_finit_le").on(t.endsOn), index("marches_actif").on(t.active)],
);

export type Contract = typeof contracts.$inferSelect;

/** Lot d'un marché alloti : le suivi des échéances se fait au lot quand il y en a. */
export const lots = pgTable(
  "lots",
  {
    id: serial("id").primaryKey(),
    contractId: integer("marche_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    numero: varchar("numero", { length: 16 }),
    subject: text("objet"),
    holder: varchar("titulaire", { length: 300 }),
    montant: numeric("montant", { precision: 14, scale: 2 }),
    fingerprint: char("empreinte", { length: 64 }).notNull(),
  },
  (t) => [index("lots_marche").on(t.contractId)],
);

export type Lot = typeof lots.$inferSelect;

/** Avenant ou tranche : modifie le montant notifié et parfois la date de fin. */
export const amendments = pgTable(
  "avenants",
  {
    id: serial("id").primaryKey(),
    contractId: integer("marche_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    numero: varchar("numero", { length: 16 }),
    subject: text("objet"),
    montant: numeric("montant", { precision: 14, scale: 2 }),
    notifiedOn: date("notifie_le"),
    nouvelleFin: date("nouvelle_fin"),
    fingerprint: char("empreinte", { length: 64 }).notNull(),
  },
  (t) => [index("avenants_marche").on(t.contractId)],
);

export type Amendment = typeof amendments.$inferSelect;

/** Engagement comptable rattaché à un marché : sert au suivi des bons de commande. */
export const commitments = pgTable(
  "engagements",
  {
    id: serial("id").primaryKey(),
    contractId: integer("marche_id").references(() => contracts.id, { onDelete: "set null" }),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    subject: text("objet"),
    montant: numeric("montant", { precision: 14, scale: 2 }),
    issuedOn: date("emis_le"),
    settled: boolean("solde").notNull().default(false),
    fingerprint: char("empreinte", { length: 64 }).notNull(),
  },
  (t) => [
    index("engagements_marche").on(t.contractId),
    index("engagements_emis_le").on(t.issuedOn),
  ],
);

export type Commitment = typeof commitments.$inferSelect;

/**
 * Facture lue dans CIRIL. `revision` isole les montants de révision de prix,
 * que le cumul mandaté servant au calcul de la récupération d'avance exclut.
 */
export const invoices = pgTable(
  "factures",
  {
    id: serial("id").primaryKey(),
    contractId: integer("marche_id").references(() => contracts.id, { onDelete: "set null" }),
    commitmentId: integer("engagement_id").references(() => commitments.id, {
      onDelete: "set null",
    }),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    montantHt: numeric("montant_ht", { precision: 14, scale: 2 }),
    montantTtc: numeric("montant_ttc", { precision: 14, scale: 2 }),
    recueLe: date("recue_le"),
    serviceFaitLe: date("service_fait_le"),
    orderedOn: date("mandatee_le"),
    state: varchar("etat", { length: 40 }),
    etatLiquidation: varchar("etat_liquidation", { length: 40 }),
    revision: boolean("revision").notNull().default(false),
    fingerprint: char("empreinte", { length: 64 }).notNull(),
  },
  (t) => [index("factures_marche").on(t.contractId), index("factures_mandatee_le").on(t.orderedOn)],
);

export type Invoice = typeof invoices.$inferSelect;

/** Issue d'une synchronisation : une panne silencieuse se voit dans la liste. */
export const synchronizationResults = pgEnum("resultat_synchronisation", [
  "en_cours",
  "succes",
  "echec",
]);

/**
 * Journal des synchronisations avec CIRIL. Lu par /health/ready : une dernière
 * synchronisation en succès de plus de 26 heures passe le service au rouge.
 */
export const synchronizations = pgTable("synchronisations", {
  id: serial("id").primaryKey(),
  demarreeLe: timestamp("demarree_le", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("terminee_le", { withTimezone: true }),
  result: synchronizationResults("resultat").notNull().default("en_cours"),
  contractsRead: integer("marches_lus").notNull().default(0),
  contractsModified: integer("marches_modifies").notNull().default(0),
  error: text("erreur"),
});

export type Synchronization = typeof synchronizations.$inferSelect;

/**
 * Décision d'une personne de l'équipe sur une alerte d'échéance. Les alertes
 * elles-mêmes se calculent à la volée depuis le référentiel ; cette table ne
 * garde que ce que l'équipe en a fait. Une alerte traitée ne revient pas tant
 * que son échéance ne change pas.
 */
export const alertTreatments = pgTable(
  "traitements_alertes",
  {
    id: serial("id").primaryKey(),
    contractId: integer("marche_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    family: varchar("famille", { length: 32 }).notNull(),
    deadlineOn: date("echeance_le").notNull(),
    comment: text("commentaire").notNull(),
    treatedBy: varchar("traite_par", { length: 64 }).notNull(),
    treatedAt: timestamp("traite_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("traitements_alertes_alerte").on(t.contractId, t.family, t.deadlineOn)],
);

export type AlertTreatment = typeof alertTreatments.$inferSelect;
