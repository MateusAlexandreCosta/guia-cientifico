// Baixa os PDFs listados em conteudo/*.json que ainda não estão no computador.
//
//   npm run baixar-pdfs
//
// Os PDFs não vão para o GitHub (ver .gitignore). Quem clonar o projeto roda este
// comando para baixá-los dos links oficiais e depois `npm run indexar`.
// Arquivos que já existem são mantidos (não baixa de novo).
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PASTA_CONTEUDO = path.join(process.cwd(), "conteudo");

const documentos = [];
for (const nome of (await readdir(PASTA_CONTEUDO)).filter((n) => n.endsWith(".json")).sort()) {
  documentos.push(...JSON.parse(await readFile(path.join(PASTA_CONTEUDO, nome), "utf8")));
}

let baixados = 0;
let existentes = 0;
const falhas = [];

for (const doc of documentos) {
  if (!doc.arquivo || !doc.url) continue;
  const destino = path.join(PASTA_CONTEUDO, doc.arquivo);
  if (existsSync(destino)) {
    existentes++;
    continue;
  }
  const url = doc.url.split("#")[0];
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (guia-cientifico)" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const dados = Buffer.from(await resp.arrayBuffer());
    // confere se é mesmo um PDF (e não uma página de erro)
    if (dados.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("o link não devolveu um PDF");
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, dados);
    baixados++;
    console.log(`ok  ${doc.arquivo} (${(dados.length / 1024 / 1024).toFixed(1)} MB)`);
  } catch (e) {
    falhas.push(doc.id);
    console.error(`FALHOU ${doc.id}: ${e.message} — ${url}`);
  }
}

console.log(`\n${baixados} baixados, ${existentes} já existiam, ${falhas.length} falharam.`);
if (falhas.length) {
  console.log("Para os que falharam, baixe manualmente e salve no caminho indicado em \"arquivo\".");
  process.exit(1);
}
if (baixados) console.log("Agora rode: npm run indexar");
