import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,       // don't fail build on ESLint errors
  },
  typescript: {
    ignoreBuildErrors: true,        // don't fail build on TS errors
  },
};

export default nextConfig;
