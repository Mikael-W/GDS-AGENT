CREATE TYPE "public"."role" AS ENUM('membre', 'owner');--> statement-breakpoint
CREATE TABLE "battements" (
	"service" varchar(64) PRIMARY KEY NOT NULL,
	"vu_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utilisateurs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sub" varchar(64) NOT NULL,
	"email" varchar(320),
	"nom" varchar(200),
	"role" "role" DEFAULT 'membre' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"vu_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utilisateurs_sub_unique" UNIQUE("sub")
);
