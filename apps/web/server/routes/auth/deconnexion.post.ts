export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const idToken = session.idToken;
  await clearUserSession(event);
  if (!idToken) {
    return sendRedirect(event, "/");
  }
  const e = env();
  const logoutUrl = new URL(`${e.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set("post_logout_redirect_uri", e.AUTH_URL);
  logoutUrl.searchParams.set("id_token_hint", idToken);
  return sendRedirect(event, logoutUrl.toString());
});
