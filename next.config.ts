import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-only database and queue libraries stay external to the bundle.
  serverExternalPackages: ["pg", "pg-boss"],
  // Lets the sidebar image list find your photos in serverless deployments.
  outputFileTracingIncludes: { "/api/sidebar-images": ["./public/sidebar-images/**/*"] },
};

export default nextConfig;
