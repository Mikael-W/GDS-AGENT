import { auth } from "@/auth";
import { trouver } from "@/lib/utilisateurs";

/** Exemple de route protégée : le compte de l'utilisateur connecté. */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ detail: "Connexion requise" }, { status: 401 });
  const compte = await trouver(session.user.id);
  if (!compte) return Response.json({ detail: "Compte inconnu" }, { status: 404 });
  return Response.json(compte);
}
