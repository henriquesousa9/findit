import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // This app has its own lockfile inside web/, separate from the sibling
  // Expo project's lockfile at the repo root — pin the root explicitly so
  // Turbopack doesn't try to guess between them.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
