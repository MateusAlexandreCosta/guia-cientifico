# Conteúdo que a IA consulta

Tudo o que o assistente usa para responder com base em textos reais fica aqui.

```
conteudo/
├── capitulos.json        ← lista dos 33 capítulos da série CEIE/SBC (vai para o Git)
├── capitulos/*.pdf       ← os PDFs (NÃO vão para o Git, ficam só no computador)
└── README.md
```

Quando você roda `npm run indexar`, o texto dos PDFs é extraído, dividido em trechos e
salvo em `data/indice/` (`trechos.json` + `vetores.bin`). É esse índice que a rota do chat lê.

## Como adicionar mais documentos

1. Coloque o PDF numa pasta dentro de `conteudo/` (pode criar outra, ex.: `conteudo/artigos/`).
2. Adicione o documento a uma lista `.json` em `conteudo/`. Pode ser no `capitulos.json`
   ou num arquivo novo (ex.: `conteudo/artigos.json`); todos os `.json` daqui são lidos.

   ```json
   [
     {
       "id": "gil-metodos",
       "colecao": "Obras de referência",
       "rotulo": "Gil (2008)",
       "titulo": "Métodos e técnicas de pesquisa social",
       "autores": "Antonio Carlos Gil",
       "url": "https://link-oficial-do-documento.pdf",
       "arquivo": "artigos/gil-metodos.pdf"
     }
   ]
   ```

   - `id`: único, sem espaços.
   - `rotulo`: como a IA vai citar a fonte (ex.: "Vol. 2, Cap. 3" ou "Gil (2008)").
   - `url`: link público para o usuário abrir (o painel adiciona `#page=N` para ir à página).
   - `arquivo`: caminho do PDF a partir de `conteudo/`.

3. Rode:

   ```bash
   npm run indexar
   ```

   Só os trechos novos ou alterados geram embedding (custo de centavos); o resto é reaproveitado.

4. (Opcional) Acrescente perguntas sobre o novo material em `scripts/perguntas-teste.json`
   e rode `npm run avaliar-busca` para conferir se a busca encontra o documento.

## Cuidados

- Só PDFs com **texto selecionável** funcionam. PDF escaneado (imagem) precisa de OCR antes;
  o `indexar` avisa quando um documento não tem texto.
- Adicione apenas material que vocês têm direito de usar. Os PDFs e o índice estão no
  `.gitignore` porque contêm o texto integral das obras.
- Para publicar na Vercel, o índice precisa ir junto com o deploy (ou para um banco como
  Supabase/pgvector). Decidir isso junto com a autorização da CEIE/SBC.
