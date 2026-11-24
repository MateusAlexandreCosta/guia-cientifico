"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ItemAcervo } from "@/lib/acervo";

type Mensagem = { role: "user" | "assistant"; content: string };

const BOAS_VINDAS: Mensagem = {
  role: "assistant",
  content:
    "Olá! Posso orientar seu trabalho com base nos capítulos do acervo (citando volume, capítulo e página) e indicar instrumentos e ferramentas. Descreva seu objetivo de pesquisa ou faça uma pergunta.",
};

const SUGESTOES = [
  {
    label: "Avaliar experiência do usuário",
    pergunta: "Quais instrumentos posso utilizar para avaliar a experiência do usuário?",
  },
  {
    label: "Planejar uma revisão sistemática",
    pergunta: "Quais materiais do acervo ajudam a planejar uma revisão sistemática da literatura?",
  },
  {
    label: "Ferramentas para pesquisa",
    pergunta: "Quais ferramentas podem auxiliar na escrita e organização científica?",
  },
];

export default function Chat() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([BOAS_VINDAS]);
  const [historico, setHistorico] = useState<Mensagem[]>([]);
  const [fontes, setFontes] = useState<ItemAcervo[] | null>(null);
  const [status, setStatus] = useState("Pronto para consultar");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens]);

  async function perguntar(pergunta: string) {
    const q = pergunta.trim();
    if (q.length < 4 || enviando) return;
    setTexto("");
    setEnviando(true);
    setStatus("Processando consulta");
    setMensagens((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "Consultando o acervo…" }]);

    // Troca o texto da última mensagem (o "Consultando o acervo…") pela resposta.
    const mostrar = (conteudo: string) =>
      setMensagens((m) => [...m.slice(0, -1), { role: "assistant", content: conteudo }]);

    let resposta = "";
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pergunta: q,
          // últimas 3 trocas; cada mensagem limitada para a requisição não ficar grande
          historico: historico.slice(-6).map((m) => ({ ...m, content: m.content.slice(0, 4000) })),
        }),
      });

      if (r.headers.get("content-type")?.includes("application/json")) {
        // Modo catálogo ou erro: a resposta vem inteira em JSON.
        const data = await r.json();
        if (!r.ok) throw new Error(data.erro || "Falha na consulta");
        resposta = data.resposta;
        setFontes(data.fontes ?? []);
        setStatus("Modo catálogo · IA ainda não configurada");
        mostrar(resposta);
      } else {
        // Modo IA: as fontes chegam no cabeçalho e o texto chega aos poucos.
        setFontes(JSON.parse(decodeURIComponent(r.headers.get("x-fontes") ?? "%5B%5D")));
        setStatus("Escrevendo resposta…");
        const leitor = r.body!.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await leitor.read();
          if (done) break;
          resposta += decoder.decode(value, { stream: true });
          mostrar(resposta);
        }
        setStatus("IA ativa · acervo priorizado");
      }
      setHistorico((h) =>
        [...h, { role: "user" as const, content: q }, { role: "assistant" as const, content: resposta }].slice(-12),
      );
    } catch (e) {
      mostrar("Não foi possível concluir a consulta: " + (e instanceof Error ? e.message : String(e)));
      setStatus("Verifique a conexão ou o servidor");
    }
    setEnviando(false);
    inputRef.current?.focus();
  }

  return (
    <div className="ai-layout">
      <section className="ai-panel" aria-label="Conversa com o assistente">
        <div className="ai-panel-header">
          <strong>Assistente de pesquisa</strong>
          <span className="ai-status" role="status">
            {status}
          </span>
        </div>
        <div className="ai-messages" ref={listaRef} role="log" aria-live="polite" aria-relevant="additions text">
          {mensagens.map((m, i) =>
            m.role === "assistant" ? (
              // Respostas da IA vêm em Markdown. O react-markdown não executa HTML,
              // então o conteúdo é exibido com segurança.
              <div key={i} className="ai-msg assistant ai-md">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div key={i} className="ai-msg user">
                {m.content}
              </div>
            ),
          )}
        </div>
        <form
          className="ai-form"
          onSubmit={(e) => {
            e.preventDefault();
            perguntar(texto);
          }}
        >
          <label className="visually-hidden" htmlFor="ai-question">
            Sua pergunta
          </label>
          <textarea
            id="ai-question"
            ref={inputRef}
            maxLength={1500}
            required
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: Qual instrumento utilizar para avaliar a experiência do usuário?"
          />
          <button className="ai-primary" type="submit" disabled={enviando}>
            Enviar
          </button>
        </form>
      </section>

      <aside className="ai-side">
        <h2 className="h5">Comece por aqui</h2>
        {SUGESTOES.map((s) => (
          <button key={s.label} type="button" onClick={() => perguntar(s.pergunta)} disabled={enviando}>
            {s.label}
          </button>
        ))}
        <hr />
        <h2 className="h5">Fontes do acervo</h2>
        <div aria-live="polite">
          {fontes === null ? (
            <p className="ai-foot">As fontes relacionadas aparecerão aqui.</p>
          ) : fontes.length === 0 ? (
            "Nenhuma referência do acervo identificada nesta consulta."
          ) : (
            fontes.map((f) => (
              <a key={f.id} className="ai-source" href={f.url} target="_blank" rel="noopener noreferrer">
                <strong>{f.titulo}</strong>
                <small>
                  {f.tipo}
                  {f.autores ? ` · ${f.autores}` : ""}
                </small>
              </a>
            ))
          )}
        </div>
        <div className="ai-alert mt-3">
          As orientações não substituem a consulta às fontes originais. Confira autores, edições, referências e
          condições de uso.
        </div>
      </aside>
    </div>
  );
}
