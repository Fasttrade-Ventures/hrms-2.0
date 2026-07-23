import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@hrms/domain",
    "@hrms/platform",
    "@hrms/db",
    "@hrms/ui",
    "@hrms/validation",
    "@hrms/testkit",
  ],
  async redirects() {
    return [
      {
        source: "/cgi-sys/:path*",
        destination: "/auth/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
