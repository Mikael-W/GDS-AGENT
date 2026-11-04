import { auth } from "@/auth";
import { FormulaireNom } from "@/components/formulaire-nom";
import { Button } from "@/components/ui/button";
import { trouver } from "@/lib/utilisateurs";

import { seConnecter, seDeconnecter } from "./actions";

export default async function Accueil() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
        <h1 className="text-2xl font-semibold">Golfe de Saint-Tropez</h1>
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
      <h1 className="text-2xl font-semibold">Golfe de Saint-Tropez</h1>
      <p>Bonjour {nom}.</p>
      <FormulaireNom nom={compte?.nom ?? ""} />
      <form action={seDeconnecter}>
        <Button type="submit" variant="outline">
          Se déconnecter
        </Button>
      </form>
    </main>
  );
}
