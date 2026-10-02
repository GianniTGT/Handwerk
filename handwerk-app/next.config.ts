import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit dhe swissqrbill lexojnë skedarë fontesh nga node_modules në runtime,
  // prandaj nuk duhen bundle-uar nga Turbopack/Webpack.
  serverExternalPackages: ["pdfkit", "swissqrbill"],
};

export default nextConfig;
