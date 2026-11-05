import type { Role } from "@projet/db/schema";

declare module "#auth-utils" {
  interface User {
    id: string;
    role: Role;
    email?: string;
    nom?: string;
  }
  interface UserSession {
    idToken?: string;
  }
}

export default defineOAuthKeycloakEventHandler({
  async onSuccess(event, { user: profil, tokens }) {
    const sub = String(profil.sub);
    const role = roleDepuisJeton(tokens.access_token);
    await enregistrer({ sub, email: profil.email, nom: profil.name, role });
    await setUserSession(event, {
      user: { id: sub, role, email: profil.email, nom: profil.name },
      idToken: tokens.id_token,
    });
    return sendRedirect(event, "/tableau-de-bord");
  },
  onError(event, erreur) {
    console.error("auth keycloak", erreur);
    return sendRedirect(event, "/?erreur=connexion");
  },
});
