from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .api import documents, search

# Create database tables (For MVP, we'll let SQLAlchemy create them if they don't exist.
# Later, we will rely entirely on Alembic for migrations.)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vibe Novel App API")

# Configure CORS so our React frontend can talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(search.router, prefix="/api/search", tags=["search"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Vibe Novel App API!", "status": "healthy"}
