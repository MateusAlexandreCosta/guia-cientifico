# Guia Científico

Catálogo de recursos para pesquisa científica com um assistente de IA apoiado no acervo.
Feito em **Next.js (React)** para publicação na Vercel.

## Primeira vez (depois de baixar o projeto)

Pré-requisito: [Node.js](https://nodejs.org) 22 ou mais novo.

**1. Instalar as dependências**

```bash
npm install
```

**2. Criar o arquivo de configuração e colocar a chave da OpenAI**

```bash
cp .env.example .env.local
```

Abra o `.env.local` e cole sua chave depois de `OPENAI_API_KEY=` (sem espaço e sem aspas).
A chave é criada em platform.openai.com → API keys e começa com `sk-proj-`.
**Nunca** envie esse arquivo para o GitHub nem cole a chave em chats (o `.gitignore` já o protege).

**3. Baixar os PDFs dos capítulos e montar o índice da IA**

```bash
npm run preparar
```

Esse comando baixa os 33 PDFs dos links oficiais (CEIE/SBC) para `conteudo/capitulos/` e
gera o índice de busca em `data/indice/` (leva menos de 1 minuto e custa centavos na OpenAI).
Os PDFs e o índice não ficam no GitHub, por isso cada pessoa gera os seus.

**4. Rodar o site**

```bash
npm run dev
```

Abra http://localhost:3000/assistente (o site completo fica em http://localhost:3000).
Para desligar, aperte `Ctrl + C` no terminal.

> Sem `OPENAI_API_KEY` o assistente funciona em **modo catálogo** (só lista recursos).
> Sem o índice (passo 3), a IA responde, mas sem o conteúdo dos capítulos.

## No dia a dia

```bash
npm run dev
```

## Comandos

| Comando | Para que serve |
|---|---|
| `npm run dev` | Roda o site para desenvolver (atualiza sozinho ao salvar arquivos) |
| `npm run preparar` | Baixa os PDFs que faltam e gera o índice (`baixar-pdfs` + `indexar`) |
| `npm run baixar-pdfs` | Só baixa os PDFs listados em `conteudo/*.json` que ainda não existem |
| `npm run indexar` | Processa os PDFs de novo (rodar depois de adicionar documentos; ver `conteudo/README.md`) |
| `npm run avaliar-busca` | Roda as perguntas de teste e mede se a busca acha o capítulo certo |
| `npm run build` e `npm start` | Roda a versão de produção (igual à que vai para a Vercel) |

## Como o projeto está organizado

| Caminho | O que é |
|---|---|
| `public/*.html` | Páginas antigas (Início, Instrumentos, Ferramentas, Sobre), ainda em HTML estático. Serão migradas para React aos poucos. |
| `public/assets/` | CSS, JavaScript e imagens das páginas antigas. |
| `public/data/` | JSONs usados pelas páginas antigas (livros, referências, ferramentas, instrumentos). |
| `app/assistente/` | Página do Assistente IA em React (`page.tsx` + `chat.tsx`). |
| `app/api/chat/route.ts` | API do chat: busca no acervo e chama o provedor de IA (substitui o antigo `api/chat.php`). |
| `lib/acervo.ts` | Busca por palavras-chave no catálogo (instrumentos, ferramentas, materiais). |
| `lib/busca.ts` | Busca semântica (RAG) nos trechos dos capítulos. |
| `data/acervo-ia.json` | Catálogo usado pela IA. Fica fora de `public/`, então não é baixável pelo navegador. |
| `conteudo/` | Lista dos documentos que a IA consulta + PDFs (ver `conteudo/README.md`). |
| `data/indice/` | Índice gerado por `npm run indexar` (não vai para o Git). |
| `scripts/` | Scripts de baixar PDFs, indexar e avaliar a busca. |
| `next.config.ts` | `/` mostra o `index.html`; `/assistente.html` redireciona para `/assistente`. |

## Trocar de provedor de IA

A rota usa o [AI SDK](https://ai-sdk.dev). Para usar outro provedor (Anthropic, Google…),
instale o pacote dele (`@ai-sdk/anthropic`, `@ai-sdk/google`) e troque a linha `model:` em
`app/api/chat/route.ts`.

## Publicar na Vercel

1. Suba o repositório no GitHub.
2. Na Vercel: **Add New → Project** e importe o repositório.
3. Em **Settings → Environment Variables**, cadastre `OPENAI_API_KEY` (e `OPENAI_MODEL`, se quiser).
4. Para usar o domínio `guiacientifico.com`, adicione-o em **Settings → Domains** e
   ajuste o DNS na Hostinger conforme a Vercel indicar.

Nunca coloque a chave da API no código nem em arquivos commitados.

**Pendente:** o índice (`data/indice/`) não está no Git, então o site publicado ainda não teria
o conteúdo dos capítulos. Antes de publicar, decidir (junto com a autorização da CEIE/SBC)
se o índice vai no repositório, é gerado no build ou vai para um banco (ex.: Supabase/pgvector).
