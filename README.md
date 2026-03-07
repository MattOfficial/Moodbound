<div align="center">

# 📚 Vibe Novel Engine

**An AI-powered reading companion that understands the *mood* of your novels.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini-API-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com)

> *"Find me a scene with a melancholic, rainy-day vibe."* — this app actually answers that.

</div>

---

## 🎯 What is this?

Vibe Novel Engine is a full-stack AI application that goes far beyond a traditional search engine. Instead of matching keywords, it understands the **semantic meaning, mood, and emotional context** of your novel collection using vector embeddings and Retrieval-Augmented Generation (RAG).

Upload a novel. Ask about a vibe. Get back the exact scene, excerpt, and AI-synthesized explanation — with source attribution.

---

## ✅ Features

| Feature | Status | Description |
|---|---|---|
| 📤 **Document Upload** | ✅ Complete | Drag-and-drop upload for PDF, EPUB, and TXT |
| 🧠 **Vibe Search** | ✅ Complete | Semantic RAG search powered by Gemini / OpenAI |
| 🔄 **Async Ingestion Pipeline** | ✅ Complete | Background ARQ workers handle heavy embedding work |
| ✂️ **Narrative Chunking** | ✅ Complete | Splits text by paragraph/scene boundaries, not blind tokens |
| 🗂️ **AI Auto-Categorization** | ✅ Complete | LLM classifies genre automatically on ingest |
| 📚 **Library Management** | ✅ Complete | View/delete books with real-time processing status |
| 🔌 **Modular AI Providers** | ✅ Complete | Swap Gemini ↔ OpenAI via a single `.env` variable |
| 🖥️ **Live System Status** | ✅ Complete | Dashboard shows active AI provider from the API |
| 🌐 **Knowledge Graph** | 🔜 Planned | Neo4j character relationship graph with React Flow |
| 🎨 **Vibe-Reactive UI** | 🔜 Planned | Theme transitions based on the mood of search results |
| 🔍 **Hybrid Search (RRF)** | 🔜 Planned | Combine dense vectors + BM25 sparse search |

---

## 🏛️ Architecture

```mermaid
graph TD
    User["🧑 User"] -->|Upload novel| FE["⚛️ React Frontend\n(Vite + Tailwind)"]
    User -->|Vibe query| FE
    FE -->|POST /api/documents| API["🐍 FastAPI Backend"]
    FE -->|POST /api/search| API
    API -->|Save file + DB record| PG[("🐘 PostgreSQL\n(Documents + Status)")]
    API -->|Enqueue job| Redis[("🔴 Redis Queue")]
    Redis -->|Dequeue| Worker["⚙️ ARQ Worker"]
    Worker -->|Parse + Chunk| Worker
    Worker -->|Generate embeddings| Gemini["✨ Gemini / OpenAI"]
    Gemini -->|Vectors| Qdrant[("🎯 Qdrant\n(Vector DB)")]
    Worker -->|Classify genre| Gemini
    Worker -->|Update status + genre| PG
    API -->|Vector similarity search| Qdrant
    API -->|LLM synthesis| Gemini
    Gemini -->|Synthesized answer| FE
    Worker -->|NER triplets [planned]| Neo4j[("🔗 Neo4j\n(Graph DB)")]
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite + TypeScript | SPA with glassmorphic UI |
| **Styling** | Tailwind CSS | Dynamic, vibe-reactive styling |
| **Backend** | Python + FastAPI | REST API & orchestration |
| **AI Orchestration** | LlamaIndex | RAG pipeline, query engine |
| **LLM / Embeddings** | Google Gemini (or OpenAI) | Synthesis, embeddings, classification |
| **Vector DB** | Qdrant | Semantic similarity search |
| **Graph DB** | Neo4j | Character relationship storage (planned) |
| **SQL DB** | PostgreSQL | Document metadata & status |
| **Task Queue** | Redis + ARQ | Async background workers |
| **Infrastructure** | Docker Compose | One-command dev environment |

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 20+
- A [Google AI API key](https://ai.google.dev) (or OpenAI key)

### 1. Clone and configure

```bash
git clone https://github.com/your-username/light-vibe-novels.git
cd light-vibe-novels
cp .env.example .env
# Edit .env and add your API key
```

### 2. Start the database stack

```bash
docker compose up -d
```

### 3. Start the backend

```bash
cd backend
pip install -r requirements.txt

# Terminal 1: API server
python -m uvicorn app.main:app --reload

# Terminal 2: Background worker
python -m arq app.worker.WorkerSettings
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) 🎉

---

## ⚙️ Configuration (`.env`)

```env
# ── AI Provider ─────────────────────────────────────────────────────
AI_PROVIDER=gemini           # or: openai

# ── Gemini (when AI_PROVIDER=gemini) ────────────────────────────────
GOOGLE_API_KEY=your_key_here
EMBEDDING_MODEL=models/text-embedding-004
FAST_LLM_MODEL=models/gemini-2.0-flash
THINKING_LLM_MODEL=models/gemini-2.0-flash-thinking-exp

# ── OpenAI (when AI_PROVIDER=openai) ────────────────────────────────
OPENAI_API_KEY=your_key_here
# EMBEDDING_MODEL=text-embedding-3-small
# FAST_LLM_MODEL=gpt-4o-mini
# THINKING_LLM_MODEL=o3-mini
```

Switching AI providers is as simple as changing one variable — no code changes required.

---

## 🔬 Engineering Highlights

### Narrative Chunking
Most RAG systems split text at fixed token counts, which breaks mid-sentence and destroys context. This system chunks by **paragraph and scene boundaries**, preserving the semantic coherence of each passage before embedding it.

### Agentic LLM Router
Queries are intercepted by a router prompt before retrieval. The LLM decides whether to consult the **Vector DB** (vibe/mood searches) or the **Graph DB** (character relationship queries). This is the foundation for true GraphRAG.

### AI Auto-Categorization
After every document is ingested and vectorized, the LLM reads the first chunk and classifies the genre using a constrained prompt — zero user effort, near-zero token cost.

### Modular AI Provider System
A single `AI_PROVIDER` environment variable determines whether the entire embedding + synthesis stack uses Gemini or OpenAI. The abstraction is clean enough that adding a new provider (e.g. Anthropic Claude, local Ollama) requires only a few lines in `ai_config.py`.

### Async Ingestion Pipeline
File upload returns instantly. Heavy work (PDF parsing, LLM embedding calls, genre classification) is dispatched to Redis-backed ARQ workers. The frontend polls for status updates every 5 seconds, showing live `Pending → Processing → Completed` transitions.

---

## 🗺️ Roadmap

- [ ] **Knowledge Graph Visualization** — D3.js/React Flow graph of character relationships extracted by NER
- [ ] **Hybrid Search (Reciprocal Rank Fusion)** — combine dense + sparse BM25 retrieval
- [ ] **Vibe-Reactive UI** — color palette and animations shift to match the emotional tone of results
- [ ] **GraphRAG Queries** — route relationship questions to Neo4j instead of Qdrant
- [ ] **Cascading Deletes** — removing a document prunes its Qdrant vectors and Neo4j entities

---

## 📄 License

MIT — use freely, attribution appreciated.
