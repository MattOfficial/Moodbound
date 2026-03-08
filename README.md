<div align="center">

# 🎧 Moodbound

**An AI-powered reading companion that understands the *mood* of your novels.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini-API-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?style=flat&logo=openai&logoColor=white)](https://platform.openai.com)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-API-4D6BFE?style=flat&logo=deepseek&logoColor=white)](https://deepseek.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com)

> *"Find me a scene with a melancholic, rainy-day vibe."* — this app actually answers that.

</div>

---

## 🎯 What is this?

Moodbound is a full-stack AI application that goes far beyond a traditional search engine. Instead of matching keywords, it understands the **semantic meaning, mood, and emotional context** of your novel collection using vector embeddings and Retrieval-Augmented Generation (RAG).

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
| 🔌 **Decoupled AI Providers** | ✅ Complete | Mix/match LLMs and Embeddings (`deepseek` + `gemini`) |
| 🌐 **Knowledge Graph** | ✅ Complete | Neo4j character relationship graph with d3-force clustering |
| ♻️ **Cascading DB Deletes** | ✅ Complete | Deleting a novel cleans Postgres, Qdrant, and Neo4j |
| 🎨 **Vibe-Reactive UI** | 🔜 Planned | Theme transitions based on the mood of search results |
| 🔍 **Hybrid Search (RRF)** | 🔜 Planned | Combine dense vectors + BM25 sparse search |

---

## 🏛️ Architecture

```mermaid
graph TD
    User["User"] -->|Upload novel| FE["React Frontend\nVite + Tailwind"]
    User -->|Mood query| FE
    FE -->|POST /api/documents| API["FastAPI Backend"]
    FE -->|POST /api/search| API
    API -->|Save file + DB record| PG[("PostgreSQL\nDocuments + Status")]
    API -->|Enqueue job| Redis[("Redis Queue")]
    Redis -->|Dequeue| Worker["ARQ Worker"]
    Worker -->|Parse + Chunk| Worker
    Worker -->|Generate embeddings| LLM["Gemini / OpenAI"]
    LLM -->|Vectors| Qdrant[("Qdrant\nVector DB")]
    Worker -->|Classify genre| LLM
    Worker -->|Update status + genre| PG
    API -->|Vector similarity search| Qdrant
    API -->|LLM synthesis| LLM
    LLM -->|Synthesized answer| FE
    Worker -.->|NER triplets, planned| Neo4j[("Neo4j\nGraph DB")]
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite + TypeScript | SPA with glassmorphic UI |
| **Styling** | Tailwind CSS | Dynamic, vibe-reactive styling |
| **Backend** | Python + FastAPI | REST API & orchestration |
| **AI Orchestration** | LlamaIndex | RAG pipeline, query engine |
| **LLM / Embeddings** | DeepSeek / OpenAI / Gemini | Synthesis, embeddings, NER extraction |
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
- A [DeepSeek API key](https://platform.deepseek.com/api_keys), [OpenAI API key](https://platform.openai.com/api-keys), or [Google AI API key](https://ai.google.dev)

### 1. Clone and configure

```bash
git clone https://github.com/your-username/moodbound.git
cd moodbound
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

Duplicate the `.env.example` file to create your local `.env` variable map.

```bash
cp .env.example .env
```

By decoupling the AI syntax via the config template, developers can mix and match providers natively — pairing DeepSeek's incredibly low-cost, high-speed API for generation with OpenAI/Gemini's highly granular embedding models.

---

## 🔬 Engineering Highlights

### Narrative Chunking
Most RAG systems split text at fixed token counts, which breaks mid-sentence and destroys context. This system chunks by **paragraph and scene boundaries**, preserving the semantic coherence of each passage before embedding it.

### Agentic LLM Router
Queries are intercepted by a router prompt before retrieval. The LLM decides whether to consult the **Vector DB** (vibe/mood searches) or the **Graph DB** (character relationship queries). This is the foundation for true GraphRAG.

### AI Auto-Categorization
After every document is ingested and vectorized, the LLM reads the first chunk and classifies the genre using a constrained prompt — zero user effort, near-zero token cost.

### Decoupled AI Architecture
RAG models historically tie embeddings and synthesis to the same provider. We decoupled this: you can explicitly define `provider/model` mappings in your `.env`. This allows us to use **DeepSeek V3** exclusively for narrative intelligence and NER relationship generation (which requires heavy token output for cheap), while using **OpenAI embeddings** for precision Qdrant indexing.

### Hybrid Search (Reciprocal Rank Fusion)
To solve the hallucination problem inherent in dense vector "vibe matching", Moodbound natively blends **BM25 Sparse Keyword** searches alongside its Qdrant dense embeddings. When a novel is ingested, both indices are built in parallel using `fastembed`. During retrieval, LlamaIndex mathematically merges both results with an `alpha=0.5` weighting, guaranteeing that exact-character nouns bubble to the absolute top of the results while preserving semantic meaning.

### Canvas WebGL Knowledge Graph
Extracting the Neo4j relationships is only half the battle. Visualizing 500+ nodes in the DOM natively crashes Chrome. We bypassed the DOM entirely and migrated the `/graph/:documentId` UI to a pure **HTML5 Canvas WebGL** engine using `react-force-graph-2d`. We intercept the draw loop to natively render Obsidian-style glowing character connections while pushing all `d3-force` layout physics to a background Web Worker to preserve a locked 60 FPS UI thread.

```mermaid
graph LR
    A[FastAPI Engine] --> B{AI Router}
    B -->|Settings.embed_model| C[Gemini / OpenAI]
    C -->|Float Vectors| D[(Qdrant DB)]
    B -->|Settings.llm| E[DeepSeek V3]
    E -->|Text & JSON| F[RAG Synthesis / NER]
```

### Concurrent Batched NER Extraction
Extracting a Neo4j knowledge graph from a 150,000-word novel in one shot would fail every LLM's context window. Instead, Moodbound slices the novel into overlapping sequential blocks, dispatches 10 parallel asynchronous routines with `asyncio.gather()`, and concurrently extracts relationships to dramatically reduce wait times from hours to roughly 35 seconds.

```mermaid
graph TD
    A["150k Word Novel"] -->|"SentenceSplitter"| B["100+ Overlapping Chunks"]
    B --> C{"asyncio.gather"}
    C -->|"Batch 1"| D["DeepSeek API"]
    C -->|"Batch 2"| E["DeepSeek API"]
    C -->|"Batch n..."| F["DeepSeek API"]
    D --> G[("Neo4j Entities")]
    E --> G
    F --> G
```

### Async Ingestion Pipeline
File upload returns instantly. Heavy work (PDF parsing, LLM embedding calls, batched graph extraction) is dispatched to Redis-backed ARQ workers. The frontend polls for status updates every 5 seconds, showing live `Loading → Parsing → Classifying → Extracting → Completed` UI transitions.

```mermaid
sequenceDiagram
    participant U as User
    participant FA as FastAPI
    participant R as Redis
    participant W as ARQ Worker

    U->>FA: Upload Novel (PDF/EPUB)
    FA->>R: Enqueue job_id
    FA-->>U: Return 200 OK (Pending)

    W->>R: Dequeue job
    W->>W: Parse Text
    W->>W: Generate Embeddings (Qdrant)
    W->>W: Batched NER Extraction (Neo4j)

    loop Every 5 Seconds
        U->>FA: Poll Status
        FA-->>U: Processing status & genre
    end
    W->>FA: Mark DB Completed
```

---

## 🗺️ Roadmap

- [x] **Hybrid Search (Reciprocal Rank Fusion)** — combined dense + sparse BM25 retrieval
- [ ] **Vibe-Reactive UI** — color palette and animations shift to match the emotional tone of results
- [ ] **GraphRAG Queries** — route relationship questions to Neo4j instead of Qdrant
- [ ] **Streaming Chat Responses** — Stream text blocks live to UI to hide API latency

---

## 📄 License

MIT — use freely, attribution appreciated.
