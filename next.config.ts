import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  // O índice da busca semântica é lido do disco pela rota do chat:
  // garante que ele seja incluído quando o projeto for publicado (Vercel).
  outputFileTracingIncludes: {
    "/api/chat": ["./data/indice/**/*"],
  },

  // As páginas antigas ficam em /public como HTML estático.
  // "/" mostra o index.html; o endereço antigo do assistente leva à página nova.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [{ source: "/assistente.html", destination: "/assistente", permanent: true }];
  },
};

export default nextConfig;
