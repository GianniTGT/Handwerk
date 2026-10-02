import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit dhe swissqrbill lexojnë skedarë fontesh nga node_modules në runtime,
  // prandaj nuk duhen bundle-uar nga Turbopack/Webpack.
  // Logo/Beleg-Uploads gehen als Server-Action-Body: Standard (1 MB) würde grosse Dateien
  // hart abbrechen, bevor unsere freundliche Fehlermeldung greift.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  serverExternalPackages: ["pdfkit", "swissqrbill"],
};

export default nextConfig;
