import type { NextConfig } from "next";

// Every app page depends on the signed-in user, so pages render dynamically
// per request (the default model) instead of using Cache Components.
const nextConfig: NextConfig = {
  // pdfkit reads its font metrics from files at runtime; keep it out of the bundle.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
