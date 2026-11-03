import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ringfence/engine ships TypeScript source (no build step), consumed via the npm workspace
  // link. Next only runs its TS/JS loader over first-party app code by default, so a workspace
  // package has to be opted in here to get the same treatment.
  transpilePackages: ["@ringfence/engine"],
};

export default nextConfig;
