import { env } from "@/lib/env";

/** Le SHA du commit déployé (argument de construction GIT_SHA). */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ sha: env().GIT_SHA });
}
