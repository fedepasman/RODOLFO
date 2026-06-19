import type { NextConfig } from "next";

/**
 * Security headers aplicados a todas las respuestas.
 * Ver SECURITY.md → "Headers de seguridad".
 *
 * Nota sobre CSP: una Content-Security-Policy estricta requiere nonces para los
 * scripts inline de Next.js y suele romper en dev. Se deja documentada en
 * SECURITY.md para activarla con cuidado en producción; acá van los headers
 * seguros que no interfieren con el funcionamiento normal.
 */
const securityHeaders = [
  // Fuerza HTTPS durante 2 años, incluyendo subdominios.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Evita que el navegador "adivine" tipos MIME.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti-clickjacking: no permitir que la app se embeba en iframes.
  { key: "X-Frame-Options", value: "DENY" },
  // No filtrar la URL completa como referer hacia otros orígenes.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desactiva APIs sensibles que la app no usa.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
