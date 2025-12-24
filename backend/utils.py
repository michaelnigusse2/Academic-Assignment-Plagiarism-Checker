import os
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import text
from models import AcademicSource

# Use host.docker.internal for Windows/Mac Docker to access host
# Fallback to localhost if not in container or networking differs
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_EMBED_MODEL = "nomic-embed-text"

def get_embedding(text_content: str) -> list[float]:
    """Generates an embedding for the given text using Ollama."""
    url = f"{OLLAMA_BASE_URL}/api/embeddings"
    
    try:
        response = httpx.post(
            url, 
            json={
                "model": OLLAMA_EMBED_MODEL,
                "prompt": text_content
            },
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
        return data["embedding"]
    except Exception as e:
        print(f"Error generating embedding: {e}")
        raise e

def retrieve_relevant_sources(query_text: str, db: Session, limit: int = 5):
    """
    Embeds the query text and retrieves the most relevant academic sources 
    using cosine distance (<=>).
    """
    try:
        query_embedding = get_embedding(query_text)
    except Exception as e:
        print(f"Failed to embed query: {e}")
        return []

    # Format the embedding as a string representation of a vector for SQL
    # pgvector expects '[1,2,3...]'
    embedding_str = str(query_embedding)

    # Use Cosine Distance (<=>) for ordering
    # Ensure pgvector extension is enabled (done in main.py)
    results = db.query(AcademicSource).order_by(
        AcademicSource.embedding.op("<=>")(query_embedding)
    ).limit(limit).all()
    
    return results
