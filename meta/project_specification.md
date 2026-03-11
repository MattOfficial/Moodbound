# Project Specification: Vibe Novel App

## 1. Project Overview
The "Vibe Novel App" is an advanced, AI-powered reading companion and knowledge extraction tool. It goes beyond simple keyword searches by utilizing a Retrieval-Augmented Generation (RAG) architecture to understand the semantic "vibe," mood, and deep lore of a user's novel collection.

## 2. Core Features
* **Vibe-Based Semantic Search:** Users can query the app using abstract moods (e.g., "Give me a quote with a melancholic, rainy-day vibe") and receive accurate excerpts, book titles, and character attributions.
* **Obsidian-Style Knowledge Graph:** A dynamic, physics-based visual web mapping out character relationships. The edges connecting characters are dynamically generated and color-coded based on the semantic nature of their relationship.
* **Agentic Routing:** A smart LLM router intercepts user queries and decides whether to query the Vector Database (for semantic/vibe searches) or the Graph Database (for relationship/lore searches).
* **Vibe-Reactive UI:** The frontend styling dynamically transitions to match the mood of the retrieved book or quote.
* **Document Library & Upload:** Users can upload novel documents (PDF, EPUB, TXT) through a drag-and-drop interface. Uploaded documents are stored in the database, asynchronously processed through the AI ingestion pipeline, and their semantic content (embeddings, entities, relationships) is extracted and indexed. Users can view their library, track processing status in real-time, and manage their collection.

## 3. Technology Stack
This stack is chosen to reflect modern, production-ready Full-Stack AI Development.

**Frontend:**
* React + TypeScript + Vite
* D3.js or React Flow (for the interactive character relationship graph)
* Tailwind CSS (for dynamic, vibe-reactive styling)

**Backend & AI Pipeline:**
* Python + FastAPI (Core backend framework)
* LlamaIndex or LangGraph (AI orchestration and agentic routing)
* Langfuse (AI Observability for tracing LLM costs, latency, and hallucinations)
* Redis + ARQ (Background task queue for asynchronous document parsing and embedding)

**Databases (All containerized via Docker):**
* PostgreSQL: Primary SQL database for user data, book metadata, and app state.
* Qdrant: Vector database for storing and querying text embeddings and semantic metadata.
* Neo4j: Graph database for storing entity relationships (Character A -> Betrayed -> Character B) to power the frontend visualization.

## 4. Key Engineering Challenges to Showcase
* **Hybrid Search:** Implementing Reciprocal Rank Fusion to combine dense vector search (meaning) with sparse BM25 search (exact keywords).
* **Narrative Chunking:** Writing custom ingestion scripts that chunk novel texts by paragraph or scene boundaries rather than blind token counts.
* **GraphRAG Ingestion:** Using an LLM during the document upload phase to perform Named Entity Recognition (NER), extract relationship triplets, and populate Neo4j automatically.
* **Async Document Processing Pipeline:** Handling large file uploads, offloading heavy parsing, embedding, and NER work to background workers via Redis, and providing real-time processing status to the frontend.
* **Cascading Data Cleanup:** When a document is deleted, ensuring its text chunks are removed from Qdrant and its entities/relationships are pruned from Neo4j.

## 5. Development Workflow
The system is being built in the following phases:

**✅ Completed MVP Milestones:**
1.  **Infrastructure:** `docker-compose.yml` for PostgreSQL, Qdrant, Neo4j, and Redis.
2.  **Document Upload MVP:** PostgreSQL `documents` table schema, FastAPI upload endpoint, raw file storage, and React upload UI with drag-and-drop.
3.  **Data Ingestion Pipeline:** FastAPI endpoints handing off heavy PDF/EPUB/TXT parsing to Redis background workers. Includes narrative chunking, embedding generation, NER, and graph population.
4.  **Retrieval Engine:** Implementing LlamaIndex routers to query Qdrant and Neo4j.
5.  **Frontend Integration:** Connecting the React app to the FastAPI backend, rendering the interactive graph, and building the document library and detail pages.

**🚀 Upcoming Production Readiness Phases:**
6.  **Multi-Tenancy & Security:** Implement JWT Authentication, update Qdrant payload filters to isolate vectors by `user_id`, isolate Neo4j graph nodes, and add API rate-limiting/guardrails.
7.  **Platform Extraction:** Extract reusable, domain-agnostic logic (like the custom narrative chunker and agentic LLM router) into modular `npm` or `pip` packages (similar to the successful extraction of `vibe-particles`).
8.  **Performance UX:** Implement a Semantic Caching Layer (Redis) for repeat queries and introduce Server-Sent Events (SSE) to stream generation text live to the UI.
9.  **Retrieval Mastery & LLMOps:** Integrate tools like Langfuse for comprehensive tracing/observability, implement Query Rewriting (HyDE) for vague queries, and introduce a cross-encoder reranker to improve context relevance before synthesis.
