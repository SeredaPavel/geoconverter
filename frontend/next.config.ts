import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // (опционально) если используешь app router и typedRoutes оставь, но это не принципиально
  experimental: {
    typedRoutes: true,
  },
  webpack: (config) => {
    // ЯВНО добавляем алиас '@' -> 'src' для webpack
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

export default nextConfig;
