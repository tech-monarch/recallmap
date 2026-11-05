import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the sidebar image list find your photos in serverless deployments.
  outputFileTracingIncludes: { "/api/sidebar-images": ["./public/sidebar-images/**/*"] },
};

export default nextConfig;
