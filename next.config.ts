import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's client loads native query engine binaries at runtime. Bundling it would
  // break those resolutions, so it stays external to the server build.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],

  // Produces a self-contained server bundle, which keeps the Fly.io production image
  // small since it does not need the full node_modules tree.
  output: "standalone",

  typescript: {
    ignoreBuildErrors: false,
  },

  // The dev overlay is injected into the page and sits above real content, which
  // makes the layout auditor report it as an element occluding the footer on small
  // viewports. Hiding it keeps audit screenshots representative of production.
  // Compile and runtime errors are still surfaced.
  devIndicators: false,
};

export default nextConfig;
