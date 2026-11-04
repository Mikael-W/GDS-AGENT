import { seDeconnecter } from "@/app/actions";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

/**
 * Bandeau commun à toutes les pages. Volontairement nu : la direction
 * visuelle est en attente de validation par le client, trois propositions
 * lui ont été envoyées (kanban/backlog/EPIC_06).
 */
export async function Entete() {
  const session = await auth();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <span className="font-semibold">Suivi des marchés</span>
        {session?.user?.id ? (
          <form action={seDeconnecter}>
            <Button type="submit" variant="outline" size="sm">
              Se déconnecter
            </Button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
