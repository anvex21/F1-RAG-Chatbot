# F1GPT

An AI-powered RAG (Retrieval-Augmented Generation) chatbot for Formula 1. Ask questions about F1 racing and get answers grounded in scraped data from Wikipedia, the official F1 site, and other sources.

---

## Description

F1GPT is a chat application that:

- **Ingests F1 content** from a fixed list of URLs (Wikipedia, formula1.com, F1 Wiki, FIA, etc.) using a one-off seed script.
- **Stores text chunks and embeddings** in Astra DB (DataStax) for vector search.
- **Answers questions** via a Next.js chat UI: each user message is embedded, similar chunks are retrieved from Astra, and an OpenAI model generates a reply using that context plus the conversation history.

The UI is a single-page chat with suggestion prompts and streaming responses.

---

## Prerequisites

- **Node.js** 18+
- **npm** (or yarn/pnpm)
- **OpenAI API key** ([platform.openai.com](https://platform.openai.com))
- **Astra DB** account ([astra.datastax.com](https://astra.datastax.com)) for vector storage
- (Optional) **Puppeteer** dependencies if you run the seed script (Chromium is downloaded automatically)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd RAG-F1-Chatbot
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
# OpenAI (required for chat and embeddings)
OPENAI_API_KEY=sk-...

# Astra DB (required for RAG)
ASTRA_DB_APPLICATION_TOKEN=AstraCS:...
ASTRA_DB_API_ENDPOINT=https://<db-id>-<region>.apps.astra.datastax.com
ASTRA_DB_NAMESPACE=default_keyspace
ASTRA_DB_COLLECTION=f1_chunks

# Optional: chat model (defaults to gpt-4o-mini)
OPENAI_CHAT_MODEL=gpt-4o-mini
```

Get your Astra token and endpoint from the Astra DB dashboard (Database → Connect → Application Token and API Endpoint). Create a namespace/keyspace if needed; the seed script can create the collection.

### 3. Seed the vector database (one-time)

Populate Astra with scraped F1 content and embeddings:

```bash
npx tsx ./scripts/loadDb.ts
```

This script:

- Scrapes the configured URLs with Puppeteer (via LangChain’s `PuppeteerWebBaseLoader`)
- Splits text with LangChain’s `RecursiveCharacterTextSplitter`
- Embeds chunks with OpenAI `text-embedding-3-small` and inserts them into the Astra collection

Run it once (or when you want to refresh data). Ensure `.env` is set and you have network access.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can ask F1 questions and use the suggestion buttons; responses stream in the chat.

---

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Start Next.js dev server       |
| `npm run build`| Production build               |
| `npm run start`| Start production server        |
| `npm run lint` | Run ESLint                     |

---

## Project structure

```
RAG-F1-Chatbot/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # POST /api/chat — RAG + streaming
│   ├── components/
│   │   ├── Bubble.tsx           # Chat message bubble
│   │   ├── LoadingBubble.tsx    # Loading indicator
│   │   ├── PromptSuggestionButton.tsx
│   │   └── PromptSuggestionsRow.tsx
│   ├── assets/
│   │   └── f1gpt.png
│   ├── global.css
│   ├── layout.tsx
│   └── page.tsx                 # Chat UI
├── scripts/
│   └── loadDb.ts                # Seed script (scrape + split + embed + Astra)
├── .env                         # Not committed; see Setup
├── next.config.ts
├── package.json
└── README.md
```

- **`app/`** — Next.js App Router: single page, one API route, shared layout and styles.
- **`app/api/chat/route.ts`** — Reads messages, embeds last user message, queries Astra for similar chunks, builds a system prompt with context, calls OpenAI with Vercel AI SDK `streamText`, returns a streamed response.
- **`scripts/loadDb.ts`** — Standalone script (run with `npm run seed`): loads URLs with LangChain + Puppeteer, splits with LangChain, embeds with OpenAI, writes to Astra.

---

## Tech stack

| Layer         | Technology  |
|---------------|-------------|
| **Framework** | Next.js 16 (App Router) |
| **UI**        | React 19, Vercel AI SDK (`@ai-sdk/react`, `ai`, `@ai-sdk/openai`) |
| **LLM / Embeddings** | OpenAI API (chat + `text-embedding-3-small`) |
| **Vector DB** | DataStax Astra DB (`@datastax/astra-db-ts`) |
| **Seed pipeline** | LangChain (`@langchain/community` — Puppeteer loader; `@langchain/textsplitters`), Puppeteer, OpenAI, Astra |

