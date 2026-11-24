// Mede se a busca semântica encontra o capítulo certo para perguntas de teste.
//
//   npm run avaliar-busca
//
// Para cada pergunta de scripts/perguntas-teste.json, verifica em que posição aparece
// o primeiro capítulo esperado. Métricas:
//   Acerto@k  = % das perguntas em que um capítulo esperado aparece entre os k primeiros
//   MRR       = média de 1/posição (1 = sempre em primeiro lugar)
// Esses números podem ir para a seção de avaliação do artigo.
//
// Compara com a busca antiga por palavras-chave (só títulos/descrições do catálogo),
// que serve de linha de base.
import { readFile } from "node:fs/promises";
import { buscarTrechos } from "../lib/busca.ts";

const perguntas = JSON.parse(await readFile(new URL("./perguntas-teste.json", import.meta.url), "utf8"));
const acervo = JSON.parse(await readFile(new URL("../data/acervo-ia.json", import.meta.url), "utf8"));
const K = [1, 3, 5];

// Mesma lógica de lib/acervo.ts (copiada porque aquele arquivo usa o alias "@/").
const STOP = new Set("para com uma que quais como qual quero sobre posso meu minha dos das por mais pesquisa cientifica utilizar preciso".split(" "));
const tokens = (s) => [...new Set(s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].filter((p) => !STOP.has(p));
function rankingPalavrasChave(pergunta) {
  const termos = tokens(pergunta);
  const casa = (ps, t) => ps.some((w) => w === t || w.startsWith(t));
  return acervo
    .filter((x) => x.tipo === "capitulo")
    .map((x) => {
      const ti = tokens(x.titulo), tx = tokens(`${x.descricao ?? ""} ${x.categoria ?? ""} ${x.tipo}`);
      let s = 0;
      for (const t of termos) { if (casa(ti, t)) s += 5; if (casa(tx, t)) s += 2; }
      return { s, id: x.id.replace(/^capitulo-v(\d)-(\d+)$/, (_, v, c) => `v${v}-cap${c.padStart(2, "0")}`) };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.id);
}

function novoPlacar() {
  return { acertos: Object.fromEntries(K.map((k) => [k, 0])), somaRR: 0 };
}
function pontuar(placar, ranking, esperado) {
  const pos = ranking.findIndex((id) => esperado.includes(id)) + 1; // 0 = não achou
  for (const k of K) if (pos && pos <= k) placar.acertos[k]++;
  placar.somaRR += pos ? 1 / pos : 0;
  return pos;
}
const marca = (pos) => (pos === 1 ? "✓" : pos ? `${pos}º` : "✗");

const semantica = novoPlacar();
const palavras = novoPlacar();
console.log("sem. | pal. | pergunta → top 3 da busca semântica");
for (const { pergunta, esperado } of perguntas) {
  // até 10 trechos, no máximo 1 por capítulo → ranking de capítulos
  const trechos = await buscarTrechos(pergunta, { limite: 10, maxPorDoc: 1, scoreMinimo: 0 });
  const ranking = trechos.map((t) => t.documento.id);
  const p1 = pontuar(semantica, ranking, esperado);
  const p2 = pontuar(palavras, rankingPalavrasChave(pergunta), esperado);
  console.log(`${marca(p1).padEnd(4)} | ${marca(p2).padEnd(4)} | ${pergunta.slice(0, 60).padEnd(60)} → ${ranking.slice(0, 3).join(", ")}`);
}

const n = perguntas.length;
console.log(`\n${n} perguntas          Semântica   Palavras-chave`);
for (const k of K) {
  const f = (p) => `${((100 * p.acertos[k]) / n).toFixed(1)}%`.padStart(9);
  console.log(`Acerto@${k}           ${f(semantica)}   ${f(palavras)}`);
}
console.log(`MRR                ${(semantica.somaRR / n).toFixed(3).padStart(9)}   ${(palavras.somaRR / n).toFixed(3).padStart(9)}`);
