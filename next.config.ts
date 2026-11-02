import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite só existe em desenvolvimento e precisa rodar fora do bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
