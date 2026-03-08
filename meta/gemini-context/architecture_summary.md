# Moodbound: Project Architecture & Context for Gemini Instances

## Purpose
This document provides full architectural context for Gemini instances stepping into the `light-vibe-novels` (Moodbound) repository. Read this to immediately understand the technology stack, data flow, and implemented features without having to blindly audit the entire codebase.

## Project Overview
**Moodbound** is a "Vibe Search" and Knowledge Graph engine for Light Novels (PDF/EPUBs). Instead of traditional keyword search, it allows users to search by emotional tone ("dark and stormy", "betrayal"), while simultaneously extracting and visualizing character relationships via an HTML5 WebGL Knowledge Graph.

## Technology Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React (Icons), `react-force-graph-2d` (WebGL Canvas Graph Rendering).
- **Backend API**: Python 3.10+, FastAPI, Uvicorn (Development Server).
- **Background Workers**: `arq` (Redis-backed Async Job Queues).
- **Database & Storage**:
  - **PostgreSQL (via SQLAlchemy)**: Relational storage for Document metadata (ID, filename, processing status, AI-determined genre).
  - **Qdrant**: Vector Database handling BOTH Dense Semantic Vectors (via Gemini/OpenAI embeddings) and Sparse Keyword Vectors (via BM25 / FastEmbed).
  - **Neo4j**: Graph Database storing character Named Entity Recognition (NER) groupings (Source Node -> Relationship Edge -> Target Node).
  - **Redis**: Message broker and state caching for the `arq` worker pool.
- **AI/LLM Framework**: LlamaIndex.
  - Pluggable routing: Configured via `.env` to route Embeddings to `text-embedding-3-small` (OpenAI) and logic/synthesis/extraction to `deepseek-chat` (DeepSeek V3/V2). Gemini is also fully supported.

## Core Features Implemented (MVP Complete)

### 1. Asynchronous Ingestion Pipeline
- **Endpoint**: `POST /api/documents/`
- **Flow**: User uploads a PDF. FastAPI immediately saves it to disk, creates a `Pending` Postgres record, pushes the `document_id` to the Redis ARQ queue, and returns `200 OK`.
- **Worker (`app/worker.py` -> `process_document`)**:
  - Parses text and chunks by narrative boundaries (paragraphs/scenes), not arbitrary token limits.
  - Asynchronously generates Qdrant embeddings (Dense + Sparse).
  - Asynchronously classifies the Novel's genre using a zero-shot LLM prompt.
  - Concurrently extracts Character Relationships (NER) using `asyncio.gather()` in 10+ parallel LLM batches to bypass context window limits, writing directly to Neo4j.

### 2. Hybrid "Vibe" Vector Search (Reciprocal Rank Fusion - RRF)
- **Endpoint**: `POST /api/search/`
- **Flow**: Uses LlamaIndex's `query_engine` instantiated with `vector_store_query_mode="hybrid"` and `alpha=0.5`.
- **Mechanic**: Blends Dense Vectors (semantic vibe matching) with BM25 Sparse Vectors (exact keyword matching) to completely eliminate LLM hallucination on specific character names or unique nouns. Returns a synthesized answer alongside exact source excerpts and similarity scores.

### 3. Canvas WebGL Knowledge Graph UI
- **Endpoint**: `GET /api/graph/{document_id}`
- **Flow**: Frontend hits FastAPI to query Neo4j for all nodes and edges belonging to a novel.
- **UI (`frontend/src/pages/Graph.tsx`)**: Renders a massive Obsidian-style constellation using `react-force-graph-2d`.
- **Mechanics**: Bypasses the DOM. Evaluates d3-force physics in a Web Worker to keep the main thread at 60 FPS. Uses custom Canvas API draw calls (`ctx.arc`, `ctx.fillText`) to mimic CSS glassmorphic aesthetics. Features complex hover states (highlighting connected nodes while fading unrelated nodes into the background).

## Project State
The MVP is complete and fully functional. The codebase is clean, styled with Tailwind UI patterns, and heavily utilizes asynchronous Python.

## Running the Application Locally
1. **Infrastructure**: `docker compose up -d` (Spins up Postgres, Redis, Neo4j, Qdrant).
2. **Backend Services**:
   - Terminal 1: `python -m uvicorn app.main:app --reload`
   - Terminal 2: `python -m arq app.worker.WorkerSettings`
3. **Frontend**:
   - Terminal 3: `npm run dev` in `/frontend`.
