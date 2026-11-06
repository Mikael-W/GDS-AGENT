import type { Role } from "@projet/db/schema";

declare module "#auth-utils" {
  interface User {
    id: string;
    role: Role;
    email?: string;
    name?: string;
  }
  interface UserSession {
    idToken?: string;
  }
}

export default defineOAuthKeycloakEventHandler({
  async onSuccess(event, { user: profile, tokens }) {
    const sub = String(profile.sub);
    const role = roleFromToken(tokens.access_token);
    await upsertUser({ sub, email: profile.email, name: profile.name, role });
    await setUserSession(event, {
      user: { id: sub, role, email: profile.email, name: profile.name },
      idToken: tokens.id_token,
    });
    return sendRedirect(event, "/tableau-de-bord");
  },
  onError(event, error) {
    console.error("auth keycloak", error);
    return sendRedirect(event, "/?erreur=connexion");
  },
});
