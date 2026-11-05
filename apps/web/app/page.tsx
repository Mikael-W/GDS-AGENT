import { auth } from "@/auth";
import { FormulaireNom } from "@/components/formulaire-nom";
import { Button } from "@/components/ui/button";
import { trouver } from "@/lib/utilisateurs";

import { seConnecter } from "./actions";

export default async function Accueil() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
        <h1 className="text-2xl font-semibold">Suivi des marchés</h1>
        <p className="text-muted-foreground">
          Les échéances, les avances et les révisions de prix des marchés de la Communauté de
          communes, rassemblées au même endroit.
        </p>
        <form action={seConnecter}>
          <Button type="submit">Se connecter</Button>
        </form>
      </main>
    );
  }

  const compte = await trouver(session.user.id);
  const nom = compte?.nom ?? compte?.email ?? "à vous";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Bonjour {nom}.</h1>
      <p className="text-muted-foreground">
        Aucune donnée n'est encore remontée de CIRIL. Les écrans de suivi arrivent avec la
        synchronisation.
      </p>
      <FormulaireNom nom={compte?.nom ?? ""} />
    </main>
  );
}
