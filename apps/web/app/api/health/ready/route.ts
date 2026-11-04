import { verifier } from "@/lib/sante";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok, corps } = await verifier();
  return Response.json(corps, { status: ok ? 200 : 503 });
}
