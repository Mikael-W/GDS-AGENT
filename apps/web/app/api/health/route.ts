/** Le processus répond (sonde de vie, aucune dépendance). */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ statut: "ok" });
}
