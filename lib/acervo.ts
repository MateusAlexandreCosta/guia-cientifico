import acervoJson from "@/data/acervo-ia.json";

export type ItemAcervo = {
  id: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  url: string;
  autores?: string;
  categoria?: string;
};

const acervo = acervoJson as ItemAcervo[];

const STOPWORDS = new Set([
  "para", "com", "uma", "que", "quais", "como", "qual", "quero", "sobre",
  "posso", "meu", "minha", "dos", "das", "por", "mais", "pesquisa",
  "cientifica", "utilizar", "preciso",
]);

/** Normaliza o texto (sem acentos, minúsculo) e devolve as palavras relevantes. */
export function tokens(texto: string): string[] {
  const limpo = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const palavras = limpo.match(/[a-z0-9]{3,}/g) ?? [];
  return [...new Set(palavras)].filter((p) => !STOPWORDS.has(p));
}

/**
 * Busca por palavras-chave no acervo (mesma lógica do antigo chat.php).
 * Título vale 5 pontos, descrição/categoria/tipo valem 2.
 * Será substituída pela busca semântica (RAG) na etapa 1 do roteiro.
 */
export function buscarNoAcervo(pergunta: string, limite = 6): ItemAcervo[] {
  const termos = tokens(pergunta);
  const casa = (palavras: string[], termo: string) =>
    palavras.some((w) => w === termo || w.startsWith(termo));

  return acervo
    .map((item) => {
      const titulo = tokens(item.titulo ?? "");
      const texto = tokens(
        `${item.descricao ?? ""} ${item.categoria ?? ""} ${item.tipo ?? ""}`,
      );
      let score = 0;
      for (const termo of termos) {
        if (casa(titulo, termo)) score += 5;
        if (casa(texto, termo)) score += 2;
      }
      return { score, item };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map((x) => x.item);
}
