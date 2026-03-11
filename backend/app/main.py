from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .api import documents, search, graph, users

# Create database tables (For MVP, we'll let SQLAlchemy create them if they don't exist.
# Later, we will rely entirely on Alembic for migrations.)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Moodbound API")

# Configure CORS so our React frontend can talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])

from fastapi.staticfiles import StaticFiles
import os

# Create uploads directory if it doesn't exist
os.makedirs("uploads/avatars", exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Moodbound API!", "status": "healthy"}

@app.get("/api/system/status")
def get_system_status():
    provider = os.getenv("AI_PROVIDER", "gemini").lower()
    if provider == "openai":
        router_display = "OpenAI"
    else:
        router_display = "Gemini"

    return {
        "status": "Online",
        "agent_router": router_display,
        "vector_db": "Qdrant"
    }
