import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce memory usage by limiting concurrent workers
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
