"use client";

import { useActionState } from "react";

import { changerNom, type EtatRenommage } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function FormulaireNom({ nom }: { nom: string }) {
  const [etat, envoyer, enCours] = useActionState<EtatRenommage, FormData>(changerNom, {});
  return (
    <form action={envoyer} className="flex flex-col gap-2">
      <label htmlFor="nom" className="text-sm text-muted-foreground">
        Nom affiché
      </label>
      <div className="flex gap-2">
        <input
          id="nom"
          name="nom"
          defaultValue={nom}
          className="h-9 flex-1 rounded-md border border-input bg-background px-3"
        />
        <Button type="submit" variant="secondary" disabled={enCours}>
          Enregistrer
        </Button>
      </div>
      {etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}
      {etat.ok && <p className="text-sm text-muted-foreground">Enregistré.</p>}
    </form>
  );
}
