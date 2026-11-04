import type { Role } from "@projet/db/schema";
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

import { env } from "@/lib/env";
import { roleDepuisJeton } from "@/lib/roles";
import { enregistrer } from "@/lib/utilisateurs";

/**
 * Connexion par Keycloak (realm du client), entièrement côté serveur :
 * flux « authorization code » avec PKCE, client confidentiel, session dans un
 * cookie chiffré. Les jetons Keycloak restent dans ce cookie, lisible par le
 * seul serveur (lib/session.ts) : la session exposée au navigateur ne contient
 * que l'identité.
 */
declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
    role?: Role;
  }
}

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; name?: string | null; email?: string | null };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const e = env();
  return {
    secret: e.AUTH_SECRET,
    // Derrière Caddy : l'hôte et le schéma viennent des en-têtes du proxy.
    trustHost: true,
    useSecureCookies: e.ENVIRONNEMENT === "prod",
    session: { strategy: "jwt", maxAge: 8 * 3600 },
    providers: [
      Keycloak({
        clientId: e.AUTH_KEYCLOAK_ID,
        clientSecret: e.AUTH_KEYCLOAK_SECRET,
        issuer: e.AUTH_KEYCLOAK_ISSUER,
      }),
    ],
    callbacks: {
      async jwt({ token, account, profile }) {
        if (account) {
          token.sub = profile?.sub ?? token.sub;
          token.idToken = account.id_token;
          // Keycloak fait foi pour le rôle ; il est relu à chaque connexion.
          token.role = roleDepuisJeton(account.access_token);
          if (token.sub) {
            await enregistrer({
              sub: token.sub,
              email: profile?.email,
              nom: profile?.name,
              role: token.role,
            });
          }
        }
        return token;
      },
      session({ session, token }) {
        // Aucun jeton ici : cet objet part au navigateur (/api/auth/session).
        if (token.sub) session.user.id = token.sub;
        session.user.role = token.role ?? "membre";
        return session;
      },
    },
  };
});
