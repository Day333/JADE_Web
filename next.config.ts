import type { NextConfig } from "next";

// Every app page depends on the signed-in user, so pages render dynamically
// per request (the default model) instead of using Cache Components.
const nextConfig: NextConfig = {};

export default nextConfig;
