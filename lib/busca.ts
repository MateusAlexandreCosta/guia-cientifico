// Busca semântica nos textos do acervo (RAG).
// Usado pela rota do chat e pelos scripts em /scripts (por isso só imports relativos).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

export const MODELO_EMBEDDING = "text-embedding-3-small";
export const DIMENSOES = 512;

export type Documento = {
  id: string;
  colecao: string;
  rotulo: string; // ex.: "Vol. 3, Cap. 4"
  titulo: string;
  autores: string;
  obra?: string;
  url: string;
};

export type Trecho = {
  doc: number; // índice em `documentos`
  pagInicio: number;
  pagFim: number;
  texto: string;
  hash: string;
};

export type ArquivoIndice = {
  modelo: string;
  dimensoes: number;
  geradoEm: string;
  documentos: Documento[];
  trechos: Trecho[];
};

export type TrechoEncontrado = Trecho & { documento: Documento; score: number };

type Indice = ArquivoIndice & { vetores: Float32Array };

export const PASTA_INDICE = path.join(process.cwd(), "data", "indice");

let cache: Indice | null | undefined;

/** Lê o índice do disco (uma vez por processo). Devolve null se ainda não foi gerado. */
export function carregarIndice(pasta = PASTA_INDICE): Indice | null {
  if (cache !== undefined) return cache;
  const arqTrechos = path.join(pasta, "trechos.json");
  const arqVetores = path.join(pasta, "vetores.bin");
  if (!existsSync(arqTrechos) || !existsSync(arqVetores)) return (cache = null);
  const dados = JSON.parse(readFileSync(arqTrechos, "utf8")) as ArquivoIndice;
  const buf = readFileSync(arqVetores);
  const vetores = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  if (vetores.length !== dados.trechos.length * dados.dimensoes) {
    throw new Error("Índice corrompido: rode `npm run indexar` de novo.");
  }
  return (cache = { ...dados, vetores });
}

export async function embedConsultas(textos: string[]): Promise<Float32Array[]> {
  const opcoes = {
    model: openai.embedding(MODELO_EMBEDDING),
    providerOptions: { openai: { dimensions: DIMENSOES } },
  };
  if (textos.length === 1) {
    const { embedding } = await embed({ ...opcoes, value: textos[0] });
    return [Float32Array.from(embedding)];
  }
  const { embeddings } = await embedMany({ ...opcoes, values: textos });
  return embeddings.map((e) => Float32Array.from(e));
}

/**
 * Devolve os trechos mais parecidos com a pergunta.
 *
 * Pode receber várias consultas (ex.: a pergunta atual e a pergunta atual junto com a
 * anterior, para entender continuações como "e como analiso os dados dela?").
 * Cada trecho recebe a maior similaridade entre as consultas.
 * maxPorDoc evita que um único capítulo ocupe todas as vagas.
 */
export async function buscarTrechos(
  consultas: string | string[],
  { limite = 6, maxPorDoc = 3, scoreMinimo = 0.25 } = {},
): Promise<TrechoEncontrado[]> {
  const indice = carregarIndice();
  if (!indice || !indice.trechos.length) return [];
  const lista = (Array.isArray(consultas) ? consultas : [consultas]).filter((c) => c.trim());
  if (!lista.length) return [];
  const qs = await embedConsultas(lista);
  const d = indice.dimensoes;

  // Os vetores da OpenAI já vêm normalizados: similaridade de cosseno = produto escalar.
  const scores = new Float32Array(indice.trechos.length);
  for (let i = 0; i < indice.trechos.length; i++) {
    const base = i * d;
    let melhor = -Infinity;
    for (const q of qs) {
      let s = 0;
      for (let j = 0; j < d; j++) s += q[j] * indice.vetores[base + j];
      if (s > melhor) melhor = s;
    }
    scores[i] = melhor;
  }

  const ordem = [...scores.keys()].sort((a, b) => scores[b] - scores[a]);
  const porDoc = new Map<number, number>();
  const resultado: TrechoEncontrado[] = [];
  for (const i of ordem) {
    if (resultado.length >= limite || scores[i] < scoreMinimo) break;
    const t = indice.trechos[i];
    const n = porDoc.get(t.doc) ?? 0;
    if (n >= maxPorDoc) continue;
    porDoc.set(t.doc, n + 1);
    resultado.push({ ...t, documento: indice.documentos[t.doc], score: scores[i] });
  }
  return resultado;
}

export function paginas(t: Pick<Trecho, "pagInicio" | "pagFim">): string {
  return t.pagInicio === t.pagFim ? `p. ${t.pagInicio}` : `p. ${t.pagInicio}–${t.pagFim}`;
}
