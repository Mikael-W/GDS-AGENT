CREATE TABLE "traitements_alertes" (
	"id" serial PRIMARY KEY NOT NULL,
	"marche_id" integer NOT NULL,
	"famille" varchar(32) NOT NULL,
	"echeance_le" date NOT NULL,
	"commentaire" text NOT NULL,
	"traite_par" varchar(64) NOT NULL,
	"traite_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traitements_alertes_alerte" UNIQUE("marche_id","famille","echeance_le")
);
--> statement-breakpoint
ALTER TABLE "traitements_alertes" ADD CONSTRAINT "traitements_alertes_marche_id_marches_id_fk" FOREIGN KEY ("marche_id") REFERENCES "public"."marches"("id") ON DELETE cascade ON UPDATE no action;