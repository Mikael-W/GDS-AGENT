const issuer = process.env.AUTH_KEYCLOAK_ISSUER ?? "";
const [serverUrl, realm] = issuer.includes("/realms/") ? issuer.split("/realms/") : ["", ""];

export default defineNuxtConfig({
  compatibilityDate: "2026-11-01",
  future: { compatibilityVersion: 4 },
  devtools: { enabled: false },
  ssr: true,
  modules: ["nuxt-auth-utils", "@sentry/nuxt/module"],
  css: ["~/assets/css/main.css"],
  components: [
    {
      path: "~/components",
      pathPrefix: false,
      extensions: ["vue"],
      ignore: ["**/tests/**", "**/types/**"],
    },
  ],
  nitro: { preset: "node-server" },
  runtimeConfig: {
    session: {
      password: process.env.AUTH_SECRET ?? "",
      cookie: {
        sameSite: "lax",
        secure: process.env.ENVIRONNEMENT === "prod",
      },
    },
    oauth: {
      keycloak: {
        clientId: process.env.AUTH_KEYCLOAK_ID ?? "",
        clientSecret: process.env.AUTH_KEYCLOAK_SECRET ?? "",
        serverUrl,
        realm,
        redirectURL: `${process.env.AUTH_URL ?? "http://localhost:9999"}/auth/keycloak`,
      },
    },
    public: {
      sentryDsn: process.env.SENTRY_DSN ?? "",
      gitSha: process.env.GIT_SHA ?? "dev",
      environment: process.env.ENVIRONNEMENT ?? "dev",
    },
  },
});
