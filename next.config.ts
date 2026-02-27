import type { NextConfig } from "next";

const securityHeaders = [
  // Impede que a página seja carregada em um iframe (proteção contra clickjacking)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Impede que o browser faça sniffing do tipo MIME
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Controla informações de referência enviadas em requisições
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Força HTTPS por 1 ano (habilitar em produção, após TLS estar estável)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Desativa APIs de hardware desnecessárias
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Content Security Policy básico — ajustar conforme dependências externas
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requer unsafe-inline/unsafe-eval no dev; em produção pode restringir mais
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      // Supabase: permite conexões de API e WebSocket
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
