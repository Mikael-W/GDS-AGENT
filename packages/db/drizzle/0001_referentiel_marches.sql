CREATE TYPE "public"."resultat_synchronisation" AS ENUM('en_cours', 'succes', 'echec');--> statement-breakpoint
CREATE TABLE "avenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"marche_id" integer NOT NULL,
	"reference" varchar(64) NOT NULL,
	"numero" varchar(16),
	"objet" text,
	"montant" numeric(14, 2),
	"notifie_le" date,
	"nouvelle_fin" date,
	"empreinte" char(64) NOT NULL,
	CONSTRAINT "avenants_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" serial PRIMARY KEY NOT NULL,
	"marche_id" integer,
	"reference" varchar(64) NOT NULL,
	"objet" text,
	"montant" numeric(14, 2),
	"emis_le" date,
	"solde" boolean DEFAULT false NOT NULL,
	"empreinte" char(64) NOT NULL,
	CONSTRAINT "engagements_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "factures" (
	"id" serial PRIMARY KEY NOT NULL,
	"marche_id" integer,
	"engagement_id" integer,
	"reference" varchar(64) NOT NULL,
	"montant_ht" numeric(14, 2),
	"montant_ttc" numeric(14, 2),
	"recue_le" date,
	"service_fait_le" date,
	"mandatee_le" date,
	"etat" varchar(40),
	"etat_liquidation" varchar(40),
	"revision" boolean DEFAULT false NOT NULL,
	"empreinte" char(64) NOT NULL,
	CONSTRAINT "factures_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"marche_id" integer NOT NULL,
	"reference" varchar(64) NOT NULL,
	"numero" varchar(16),
	"objet" text,
	"titulaire" varchar(300),
	"montant" numeric(14, 2),
	"empreinte" char(64) NOT NULL,
	CONSTRAINT "lots_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "marches" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(64) NOT NULL,
	"objet" text,
	"titulaire" varchar(300),
	"service" varchar(120),
	"notifie_le" date,
	"debute_le" date,
	"finit_le" date,
	"montant_initial" numeric(14, 2),
	"montant_avenants" numeric(14, 2),
	"montant_revisions" numeric(14, 2),
	"montant_retenues" numeric(14, 2),
	"montant_disponible" numeric(14, 2),
	"reconduction_tacite" boolean,
	"reconductions_max" integer,
	"a_bons_de_commande" boolean DEFAULT false NOT NULL,
	"garantie_finit_le" date,
	"receptionne_le" date,
	"solde" boolean DEFAULT false NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"empreinte" char(64) NOT NULL,
	"lu_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marches_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "synchronisations" (
	"id" serial PRIMARY KEY NOT NULL,
	"demarree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"terminee_le" timestamp with time zone,
	"resultat" "resultat_synchronisation" DEFAULT 'en_cours' NOT NULL,
	"marches_lus" integer DEFAULT 0 NOT NULL,
	"marches_modifies" integer DEFAULT 0 NOT NULL,
	"erreur" text
);
--> statement-breakpoint
ALTER TABLE "avenants" ADD CONSTRAINT "avenants_marche_id_marches_id_fk" FOREIGN KEY ("marche_id") REFERENCES "public"."marches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_marche_id_marches_id_fk" FOREIGN KEY ("marche_id") REFERENCES "public"."marches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_marche_id_marches_id_fk" FOREIGN KEY ("marche_id") REFERENCES "public"."marches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_marche_id_marches_id_fk" FOREIGN KEY ("marche_id") REFERENCES "public"."marches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "avenants_marche" ON "avenants" USING btree ("marche_id");--> statement-breakpoint
CREATE INDEX "engagements_marche" ON "engagements" USING btree ("marche_id");--> statement-breakpoint
CREATE INDEX "engagements_emis_le" ON "engagements" USING btree ("emis_le");--> statement-breakpoint
CREATE INDEX "factures_marche" ON "factures" USING btree ("marche_id");--> statement-breakpoint
CREATE INDEX "factures_mandatee_le" ON "factures" USING btree ("mandatee_le");--> statement-breakpoint
CREATE INDEX "lots_marche" ON "lots" USING btree ("marche_id");--> statement-breakpoint
CREATE INDEX "marches_finit_le" ON "marches" USING btree ("finit_le");--> statement-breakpoint
CREATE INDEX "marches_actif" ON "marches" USING btree ("actif");