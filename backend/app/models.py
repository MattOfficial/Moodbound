import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from .database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, index=True, nullable=False)
    content_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, default="Pending")  # Pending, Processing, Completed, Failed
    genre = Column(String, default="Uncategorized")  # e.g. Fantasy, Sci-Fi, Romance...
    created_at = Column(DateTime, default=datetime.utcnow)


