import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the sidebar image list find your photos in serverless deployments.
  outputFileTracingIncludes: { "/api/sidebar-images": ["./public/sidebar-images/**/*"] },
  async headers() {
    return [
      {
        // The service worker must always be re-checked so updates ship immediately, and may only
        // load its own scripts.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
