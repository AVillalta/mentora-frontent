import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: {
      exclude: ["error", "warn"], // Mantener console.error y console.warn en producción
    },
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignorar errores de ESLint durante la compilación
  },
  images: {
    domains: ["localhost"], // Permitir imágenes desde localhost
  },
};

export default nextConfig;