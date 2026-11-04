import "server-only";

import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";

/** Le contenu chiffré du cookie de session, lisible par le serveur seul. */
export async function jetonDeSession() {
  const e = env();
  const secure = e.ENVIRONNEMENT === "prod";
  return getToken({
    req: { headers: { cookie: (await cookies()).toString() } },
    secret: e.AUTH_SECRET,
    secureCookie: secure,
  });
}
