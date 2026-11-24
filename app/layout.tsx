import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Guia Científico — Recursos para Pesquisa Científica",
  description:
    "Instrumentos de pesquisa, ferramentas digitais e materiais metodológicos reunidos para apoiar a pesquisa científica.",
  icons: { icon: "/assets/img/logotipo.png" },
};

// As páginas antigas (index, instrumentos, ferramentas, sobre) continuam como
// HTML estático em /public. Este layout vale só para as páginas em React,
// e carrega os mesmos estilos para manter a identidade visual.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/assets/css/site.css" />
        <link rel="stylesheet" href="/assets/css/acessibilidade.css" />
      </head>
      <body>
        {children}
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          strategy="afterInteractive"
        />
        {/* lazyOnload: o script mexe no DOM (menu, rodapé), então só roda depois
            que o React terminou de montar a página, evitando erro de hidratação. */}
        <Script src="/assets/js/acessibilidade.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
