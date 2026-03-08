# Phase 2: Document Upload MVP

Fantastic work! We have now established our FastAPI backend and enabled our application to accept document uploads and track them in our PostgreSQL database.

## What Was Accomplished

1. **FastAPI Initialization**: We created the [backend/app/main.py](file:///c:/Users/matru/Code/ai-antigravity-gen/light-vibe-novels/backend/app/main.py) file, which is the entry point for our server. This sets up the critical CORS (Cross-Origin Resource Sharing) middleware, allowing our future React frontend to communicate with this API securely.
2. **Database Engine & ORM Setup**:
    - Created [backend/app/database.py](file:///c:/Users/matru/Code/ai-antigravity-gen/light-vibe-novels/backend/app/database.py) to establish a connection to our PostgreSQL container using SQLAlchemy.
    - Created [backend/app/models.py](file:///c:/Users/matru/Code/ai-antigravity-gen/light-vibe-novels/backend/app/models.py) which translates Python classes into SQL tables (Object-Relational Mapping). We defined the [Document](file:///c:/Users/matru/Code/ai-antigravity-gen/light-vibe-novels/backend/app/models.py#7-16) schema to track our uploaded light novels.
3. **The Upload Endpoint**: Created the `POST /api/documents/` route ([backend/app/api/documents.py](file:///c:/Users/matru/Code/ai-antigravity-gen/light-vibe-novels/backend/app/api/documents.py)). This endpoint handles incoming multipart form data (the physical files), saves them temporarily to disk, and inserts a "Pending" record into our database.
4. **Database Migrations with Alembic**: We initialized Alembic and generated an initial migration. This ensures our database schema stays perfectly synchronized with our Python models over time!

## Technical Details (The "Why")

### FastAPI & Dependency Injection
In React, you often use `useContext()` to inject global state or services down into your component tree without prop-drilling.

FastAPI uses a remarkably similar concept called **Dependency Injection**, denoted by the `Depends()` keyword.
Look at our upload route signature: `async def upload_document(..., db: Session = Depends(get_db)):`.

Every time a user hits this endpoint, FastAPI automatically calls the [get_db()](file:///c:/Users/matru/Code/ai-antigravity-gen/light-vibe-novels/backend/app/database.py#29-35) generator function, creates a fresh database connection (`db: Session`), passes it into the function, and ensures it is safely closed when the function is finished. It's clean, beautiful, and highly efficient!

### Why Alembic?
Instead of just creating tables directly, we use Alembic migrations. Think of Alembic like **Git for your database schema structure**. If we decide later to add a `word_count` column to our `documents` table, Alembic will track that change in a versioned script, allowing us to safely upgrade (or rollback) the database schema predictably across environments.

## Validation
We started the FastAPI server using `uvicorn app.main:app --reload` and successfully sent an actual file (`sample_novel.txt`) via a cURL command. The backend responded perfectly with a newly generated UUID and marked the document as "Pending"!

## Next Steps
With the MVP upload infrastructure working, the true challenge begins: processing those documents asynchronously in the background. We are moving on to Phase 3: The Data Ingestion Pipeline!
