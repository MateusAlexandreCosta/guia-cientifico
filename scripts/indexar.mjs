// Gera o índice de busca semântica a partir dos PDFs em /conteudo.
//
//   npm run indexar
//
// 1. Lê todos os arquivos conteudo/*.json (cada um é uma lista de documentos).
// 2. Extrai o texto de cada PDF, página por página.
// 3. Divide em trechos de ~1-2 parágrafos, guardando as páginas.
// 4. Gera os embeddings (só dos trechos novos; os que não mudaram são reaproveitados).
// 5. Salva em data/indice/trechos.json + data/indice/vetores.bin.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractText, getDocumentProxy } from "unpdf";
import { DIMENSOES, MODELO_EMBEDDING, PASTA_INDICE } from "../lib/busca.ts";

const PASTA_CONTEUDO = path.join(process.cwd(), "conteudo");
const TAMANHO_ALVO = 1400; // caracteres por trecho
const TAMANHO_MAX = 1900;
const SOBREPOSICAO = 250; // repete o final do trecho anterior para não cortar ideias
const LOTE_EMBEDDINGS = 150;

if (!process.env.OPENAI_API_KEY) {
  console.error("Falta OPENAI_API_KEY: coloque no .env.local (no computador) ou nas Environment Variables (na Vercel).");
  process.exit(1);
}

// ---------- 1. documentos ----------
const documentos = [];
for (const nome of (await readdir(PASTA_CONTEUDO)).filter((n) => n.endsWith(".json")).sort()) {
  const lista = JSON.parse(await readFile(path.join(PASTA_CONTEUDO, nome), "utf8"));
  for (const d of lista) {
    for (const campo of ["id", "titulo", "arquivo", "url"]) {
      if (!d[campo]) throw new Error(`${nome}: documento sem "${campo}": ${JSON.stringify(d).slice(0, 120)}`);
    }
    if (documentos.some((x) => x.id === d.id)) throw new Error(`id repetido: ${d.id}`);
    documentos.push(d);
  }
}
console.log(`${documentos.length} documentos encontrados em conteudo/*.json`);

// ---------- 2 e 3. texto e trechos ----------
function limparPagina(texto) {
  return texto
    .replace(/^\s*\d{1,4}\s*\n/, "") // número da página no topo
    .replace(/([a-záéíóúâêôãõç])-\n([a-záéíóúâêôãõç])/g, "$1$2") // palavra quebrada no fim da linha
    .replace(/\s+/g, " ")
    .trim();
}

function dividirEmFrases(texto) {
  return texto.split(/(?<=[.!?;:])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9"“(•\-–])/).filter(Boolean);
}

function criarTrechos(paginas) {
  // paginas: [{ pagina, texto }]
  const frases = [];
  for (const { pagina, texto } of paginas) {
    for (let f of dividirEmFrases(texto)) {
      while (f.length > TAMANHO_MAX) {
        frases.push({ pagina, texto: f.slice(0, TAMANHO_ALVO) });
        f = f.slice(TAMANHO_ALVO);
      }
      frases.push({ pagina, texto: f });
    }
  }
  const trechos = [];
  let atual = [];
  let tamanho = 0;
  const fechar = () => {
    if (!atual.length) return;
    trechos.push({
      pagInicio: atual[0].pagina,
      pagFim: atual[atual.length - 1].pagina,
      texto: atual.map((f) => f.texto).join(" "),
    });
    // começa o próximo com as últimas frases (sobreposição)
    const resto = [];
    let n = 0;
    for (let i = atual.length - 1; i >= 0 && n < SOBREPOSICAO; i--) {
      resto.unshift(atual[i]);
      n += atual[i].texto.length;
    }
    atual = resto.length < atual.length ? resto : [];
    tamanho = atual.reduce((s, f) => s + f.texto.length + 1, 0);
  };
  for (const f of frases) {
    if (tamanho + f.texto.length > TAMANHO_MAX) fechar();
    atual.push(f);
    tamanho += f.texto.length + 1;
    if (tamanho >= TAMANHO_ALVO) fechar();
  }
  if (atual.length && tamanho > SOBREPOSICAO) fechar();
  return trechos;
}

const trechos = [];
let totalPaginas = 0;
for (const [i, doc] of documentos.entries()) {
  const arquivo = path.join(PASTA_CONTEUDO, doc.arquivo);
  if (!existsSync(arquivo)) throw new Error(`PDF não encontrado: conteudo/${doc.arquivo}`);
  const pdf = await getDocumentProxy(new Uint8Array(await readFile(arquivo)));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  totalPaginas += totalPages;
  const paginas = text.map((t, p) => ({ pagina: p + 1, texto: limparPagina(t) })).filter((p) => p.texto);
  const doDoc = criarTrechos(paginas);
  if (!doDoc.length) console.warn(`  aviso: ${doc.id} não tem texto extraível (PDF escaneado?)`);
  for (const t of doDoc) {
    const paraEmbedding = `${doc.titulo} (${doc.rotulo ?? doc.id})\n${t.texto}`;
    trechos.push({
      doc: i,
      ...t,
      hash: createHash("sha256").update(MODELO_EMBEDDING + DIMENSOES + paraEmbedding).digest("hex").slice(0, 16),
      paraEmbedding,
    });
  }
  process.stdout.write(`\r  texto extraído: ${i + 1}/${documentos.length}`);
}
console.log(`\n${totalPaginas} páginas → ${trechos.length} trechos`);

// ---------- 4. embeddings (reaproveitando o índice anterior) ----------
const anteriores = new Map();
try {
  const velho = JSON.parse(await readFile(path.join(PASTA_INDICE, "trechos.json"), "utf8"));
  const buf = await readFile(path.join(PASTA_INDICE, "vetores.bin"));
  const v = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  if (velho.dimensoes === DIMENSOES && velho.modelo === MODELO_EMBEDDING) {
    velho.trechos.forEach((t, k) => anteriores.set(t.hash, v.slice(k * DIMENSOES, (k + 1) * DIMENSOES)));
  }
} catch {}

const faltam = trechos.filter((t) => !anteriores.has(t.hash));
console.log(`${trechos.length - faltam.length} trechos reaproveitados, ${faltam.length} para gerar embedding`);
let tokens = 0;
for (let k = 0; k < faltam.length; k += LOTE_EMBEDDINGS) {
  const lote = faltam.slice(k, k + LOTE_EMBEDDINGS);
  const { embeddings, usage } = await embedMany({
    model: openai.embedding(MODELO_EMBEDDING),
    values: lote.map((t) => t.paraEmbedding),
    providerOptions: { openai: { dimensions: DIMENSOES } },
  });
  tokens += usage?.tokens ?? 0;
  lote.forEach((t, j) => anteriores.set(t.hash, Float32Array.from(embeddings[j])));
  process.stdout.write(`\r  embeddings: ${Math.min(k + LOTE_EMBEDDINGS, faltam.length)}/${faltam.length}`);
}
if (faltam.length) console.log(`\n  tokens usados: ${tokens.toLocaleString("pt-BR")}`);

// ---------- 5. salvar ----------
const vetores = new Float32Array(trechos.length * DIMENSOES);
trechos.forEach((t, k) => vetores.set(anteriores.get(t.hash), k * DIMENSOES));
await mkdir(PASTA_INDICE, { recursive: true });
await writeFile(
  path.join(PASTA_INDICE, "trechos.json"),
  JSON.stringify({
    modelo: MODELO_EMBEDDING,
    dimensoes: DIMENSOES,
    geradoEm: new Date().toISOString(),
    documentos: documentos.map(({ id, colecao, rotulo, titulo, autores, obra, url }) => ({
      id, colecao, rotulo: rotulo ?? id, titulo, autores: autores ?? "", obra, url,
    })),
    trechos: trechos.map(({ doc, pagInicio, pagFim, texto, hash }) => ({ doc, pagInicio, pagFim, texto, hash })),
  }),
);
await writeFile(path.join(PASTA_INDICE, "vetores.bin"), Buffer.from(vetores.buffer));
console.log(`Índice salvo em data/indice/ (${trechos.length} trechos).`);
