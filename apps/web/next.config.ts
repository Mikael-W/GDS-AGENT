import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // L'accès à la base est un paquet TypeScript du dépôt, compilé par Next.
  transpilePackages: ["@projet/db"],
  // Les prompts sont lus sur disque par le serveur : on les embarque.
  outputFileTracingIncludes: { "/**": ["./prompts/**"] },
};

export default config;
