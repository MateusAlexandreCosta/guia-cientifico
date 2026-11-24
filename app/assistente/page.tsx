import type { Metadata } from "next";
import Chat from "./chat";

export const metadata: Metadata = {
  title: "Assistente IA — Guia Científico",
  description:
    "Assistente do Guia Científico para busca de instrumentos, ferramentas e materiais metodológicos.",
};

const MENU = [
  { href: "/index.html", label: "Início" },
  { href: "/instrumentos.html", label: "Instrumentos de Pesquisa" },
  { href: "/ferramentas.html", label: "Ferramentas" },
  { href: "/sobre.html", label: "Sobre/Contato" },
  { href: "/assistente", label: "Assistente IA", ativo: true },
];

export default function AssistentePage() {
  return (
    <>
      <link rel="stylesheet" href="/assets/css/assistente.css" precedence="default" />
      <div className="colorline" aria-hidden="true" />
      <header className="site-header sticky-top bg-white">
        <nav className="navbar navbar-expand-lg container py-3">
          <a className="navbar-brand d-flex align-items-center gap-2" href="/index.html">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/img/logo.png"
              alt=""
              style={{ width: 56, height: 56, objectFit: "contain" }}
            />
            <span className="brand-text">Guia Científico</span>
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Abrir menu"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="mainNav">
            <ul className="navbar-nav ms-auto gap-lg-4">
              {MENU.map((item) => (
                <li className="nav-item" key={item.href}>
                  <a
                    className={`nav-link${item.ativo ? " active" : ""}`}
                    aria-current={item.ativo ? "page" : undefined}
                    href={item.href}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      <main id="conteudo" className="container">
        <section className="ai-hero">
          <p className="ai-tag">PESQUISA CIENTÍFICA · ASSISTÊNCIA INTELIGENTE</p>
          <h1>
            Guia Científico <em>IA</em>
          </h1>
          <p>Consulte o acervo, encontre recursos e receba orientações para planejar sua pesquisa.</p>
          <a href="/index.html" className="text-link">
            ← Voltar ao início
          </a>
        </section>
        <Chat />
      </main>

      <footer className="site-footer">
        <div className="container py-4 d-flex flex-column flex-md-row justify-content-between gap-2">
          <span>
            <strong>Guia Científico</strong> · Recursos para pesquisa científica
          </span>
          <span className="small muted">As fontes originais permanecem identificadas.</span>
        </div>
      </footer>
    </>
  );
}
