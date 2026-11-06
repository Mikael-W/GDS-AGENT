/**
 * Réglages communs des tests. Les tests qui touchent la base utilisent
 * TEST_DATABASE_URL (base jetable : `make test` la démarre, la CI fournit un
 * conteneur) ; sans elle ils sont ignorés en local et échouent en CI
 * (EXIGER_BASE=1).
 */
if (process.env.REQUIRE_DATABASE === "1" && !process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL est requise (EXIGER_BASE=1)");
}

Object.assign(process.env, {
  ENVIRONNEMENT: "test",
  AUTH_SECRET: "secret-de-test-assez-long-pour-auth-js-0123456789",
  AUTH_KEYCLOAK_ISSUER: "https://auth.exemple.test/realms/client",
  AUTH_KEYCLOAK_ID: "client-web",
  AUTH_KEYCLOAK_SECRET: "secret",
});
