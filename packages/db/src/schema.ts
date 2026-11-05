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

/**
 * Référentiel recopié de CIRIL, jamais écrit vers CIRIL : l'application lit,
 * calcule et propose, les équipes décident dans CIRIL. Les identifiants
 * d'origine (`reference`) viennent de CIRIL et font foi ; `empreinte` est le
 * condensé de la charge utile lue, qui sert à repérer ce qui a changé depuis
 * la veille, CIRIL n'exposant aucune date de dernière modification.
 */
export const marches = pgTable(
  "marches",
  {
    id: serial("id").primaryKey(),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    objet: text("objet"),
    titulaire: varchar("titulaire", { length: 300 }),
    service: varchar("service", { length: 120 }),
    notifieLe: date("notifie_le"),
    debuteLe: date("debute_le"),
    finitLe: date("finit_le"),
    montantInitial: numeric("montant_initial", { precision: 14, scale: 2 }),
    montantAvenants: numeric("montant_avenants", { precision: 14, scale: 2 }),
    montantRevisions: numeric("montant_revisions", { precision: 14, scale: 2 }),
    montantRetenues: numeric("montant_retenues", { precision: 14, scale: 2 }),
    montantDisponible: numeric("montant_disponible", { precision: 14, scale: 2 }),
    reconductionTacite: boolean("reconduction_tacite"),
    reconductionsMax: integer("reconductions_max"),
    // Alimentent les règles d'échéance (apps/web/lib/echeances.ts).
    aBonsDeCommande: boolean("a_bons_de_commande").notNull().default(false),
    garantieFinitLe: date("garantie_finit_le"),
    receptionneLe: date("receptionne_le"),
    solde: boolean("solde").notNull().default(false),
    actif: boolean("actif").notNull().default(true),
    empreinte: char("empreinte", { length: 64 }).notNull(),
    luLe: timestamp("lu_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("marches_finit_le").on(t.finitLe), index("marches_actif").on(t.actif)],
);

export type Marche = typeof marches.$inferSelect;

/** Lot d'un marché alloti : le suivi des échéances se fait au lot quand il y en a. */
export const lots = pgTable(
  "lots",
  {
    id: serial("id").primaryKey(),
    marcheId: integer("marche_id")
      .notNull()
      .references(() => marches.id, { onDelete: "cascade" }),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    numero: varchar("numero", { length: 16 }),
    objet: text("objet"),
    titulaire: varchar("titulaire", { length: 300 }),
    montant: numeric("montant", { precision: 14, scale: 2 }),
    empreinte: char("empreinte", { length: 64 }).notNull(),
  },
  (t) => [index("lots_marche").on(t.marcheId)],
);

export type Lot = typeof lots.$inferSelect;

/** Avenant ou tranche : modifie le montant notifié et parfois la date de fin. */
export const avenants = pgTable(
  "avenants",
  {
    id: serial("id").primaryKey(),
    marcheId: integer("marche_id")
      .notNull()
      .references(() => marches.id, { onDelete: "cascade" }),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    numero: varchar("numero", { length: 16 }),
    objet: text("objet"),
    montant: numeric("montant", { precision: 14, scale: 2 }),
    notifieLe: date("notifie_le"),
    nouvelleFin: date("nouvelle_fin"),
    empreinte: char("empreinte", { length: 64 }).notNull(),
  },
  (t) => [index("avenants_marche").on(t.marcheId)],
);

export type Avenant = typeof avenants.$inferSelect;

/** Engagement comptable rattaché à un marché : sert au suivi des bons de commande. */
export const engagements = pgTable(
  "engagements",
  {
    id: serial("id").primaryKey(),
    marcheId: integer("marche_id").references(() => marches.id, { onDelete: "set null" }),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    objet: text("objet"),
    montant: numeric("montant", { precision: 14, scale: 2 }),
    emisLe: date("emis_le"),
    solde: boolean("solde").notNull().default(false),
    empreinte: char("empreinte", { length: 64 }).notNull(),
  },
  (t) => [index("engagements_marche").on(t.marcheId), index("engagements_emis_le").on(t.emisLe)],
);

export type Engagement = typeof engagements.$inferSelect;

/**
 * Facture lue dans CIRIL. `revision` isole les montants de révision de prix,
 * que le cumul mandaté servant au calcul de la récupération d'avance exclut.
 */
export const factures = pgTable(
  "factures",
  {
    id: serial("id").primaryKey(),
    marcheId: integer("marche_id").references(() => marches.id, { onDelete: "set null" }),
    engagementId: integer("engagement_id").references(() => engagements.id, {
      onDelete: "set null",
    }),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    montantHt: numeric("montant_ht", { precision: 14, scale: 2 }),
    montantTtc: numeric("montant_ttc", { precision: 14, scale: 2 }),
    recueLe: date("recue_le"),
    serviceFaitLe: date("service_fait_le"),
    mandateeLe: date("mandatee_le"),
    etat: varchar("etat", { length: 40 }),
    etatLiquidation: varchar("etat_liquidation", { length: 40 }),
    revision: boolean("revision").notNull().default(false),
    empreinte: char("empreinte", { length: 64 }).notNull(),
  },
  (t) => [index("factures_marche").on(t.marcheId), index("factures_mandatee_le").on(t.mandateeLe)],
);

export type Facture = typeof factures.$inferSelect;

/** Issue d'une synchronisation : une panne silencieuse se voit dans la liste. */
export const resultatsSynchronisation = pgEnum("resultat_synchronisation", [
  "en_cours",
  "succes",
  "echec",
]);

/**
 * Journal des synchronisations avec CIRIL. Lu par /health/ready : une dernière
 * synchronisation en succès de plus de 26 heures passe le service au rouge.
 */
export const synchronisations = pgTable("synchronisations", {
  id: serial("id").primaryKey(),
  demarreeLe: timestamp("demarree_le", { withTimezone: true }).notNull().defaultNow(),
  termineeLe: timestamp("terminee_le", { withTimezone: true }),
  resultat: resultatsSynchronisation("resultat").notNull().default("en_cours"),
  marchesLus: integer("marches_lus").notNull().default(0),
  marchesModifies: integer("marches_modifies").notNull().default(0),
  erreur: text("erreur"),
});

export type Synchronisation = typeof synchronisations.$inferSelect;

/**
 * Décision d'une personne de l'équipe sur une alerte d'échéance. Les alertes
 * elles-mêmes se calculent à la volée depuis le référentiel ; cette table ne
 * garde que ce que l'équipe en a fait. Une alerte traitée ne revient pas tant
 * que son échéance ne change pas.
 */
export const traitementsAlertes = pgTable(
  "traitements_alertes",
  {
    id: serial("id").primaryKey(),
    marcheId: integer("marche_id")
      .notNull()
      .references(() => marches.id, { onDelete: "cascade" }),
    famille: varchar("famille", { length: 32 }).notNull(),
    echeanceLe: date("echeance_le").notNull(),
    commentaire: text("commentaire").notNull(),
    traitePar: varchar("traite_par", { length: 64 }).notNull(),
    traiteLe: timestamp("traite_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("traitements_alertes_alerte").on(t.marcheId, t.famille, t.echeanceLe)],
);

export type TraitementAlerte = typeof traitementsAlertes.$inferSelect;
