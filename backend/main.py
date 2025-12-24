import os
import shutil
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx

import models
import auth
import database


# Configuration
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
UPLOAD_DIR = "/data/uploads"

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Database Setup
with database.engine.begin() as connection:
    connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    
    # Simple migration for new columns
    try:
        connection.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS topic VARCHAR"))
        connection.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS academic_level VARCHAR"))
        connection.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS plagiarism_score FLOAT"))
        connection.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS research_suggestions JSON"))
    except Exception as e:
        print(f"Migration warning: {e}") 


models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Models
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class AssignmentResponse(BaseModel):
    id: int
    filename: str
    uploaded_at: str

# Routes

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(user: RegisterRequest, db: Session = Depends(auth.get_db)):
    db_user = db.query(models.Student).filter(models.Student.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.hash_password(user.password)
    new_user = models.Student(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name
    )
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@app.post("/auth/login", response_model=Token)
def login(user_credentials: LoginRequest, db: Session = Depends(auth.get_db)):
    user = db.query(models.Student).filter(models.Student.email == user_credentials.email).first()
    if not user or not auth.verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: models.Student = Depends(auth.get_current_user),
    db: Session = Depends(auth.get_db)
):
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    
    # Save file
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create DB Record
    new_assignment = models.Assignment(
        student_id=current_user.id,
        filename=file.filename
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    
    # Trigger n8n Webhook
    if N8N_WEBHOOK_URL:
        async with httpx.AsyncClient() as client:
            try:
                await client.post(
                    N8N_WEBHOOK_URL,
                    json={
                        "assignment_id": new_assignment.id,
                        "file_path": f"/data/uploads/{file.filename}" # Hardcoded container path
                    }
                )
            except Exception as e:
                # Log error or handle it, but don't fail the request if webhook fails?
                # User requirement: "Call N8N_WEBHOOK_URL". 
                # I'll print error for now, but proceed.
                print(f"Failed to call webhook: {e}")

    return {
        "id": new_assignment.id,
        "filename": new_assignment.filename,
        "status": "uploaded",
        "message": "Assignment uploaded and processing started"
    }

import json

class AnalyzeRequest(BaseModel):
    assignment_id: int

class ResearchSuggestion(BaseModel):
    source_id: int
    source_title: str
    reason: str

class AnalyzeResponse(BaseModel):
    topic: str
    academic_level: str
    plagiarism_score: float
    research_suggestions: list[ResearchSuggestion]


# ... imports
# Need to import utils
import utils

# ... existing code ...

def analyze_with_llm(
    text_content: str,
    sources: list[models.AcademicSource]
) -> dict:
    url = f"{utils.OLLAMA_BASE_URL}/api/generate"

    # ✅ Initialize sources_text correctly
    sources_text = ""

    for i, source in enumerate(sources, start=1):
        sources_text += f"""
[{i}]
Source ID: {source.id}
Title: {source.title}
Content: {source.content[:500]}
"""

    prompt = f"""
You are an academic assistant performing STRICT retrieval-augmented analysis.

MANDATORY RULES:
- You may ONLY use the Academic Sources below.
- You may NOT invent new sources.
- You may NOT introduce topics not present in the sources.
- If sources are weak, return fewer suggestions.
- CRITICAL: If you assign a Plagiarism Score >= 0.5, you MUST provide at least one Research Suggestion that matches the plagiarized content.
- If you cannot find any matching source to suggest, the Plagiarism Score MUST be low (< 0.2).

Academic Sources:
{sources_text}

Assignment:
{text_content[:3000]}

Return STRICT JSON ONLY with the following fields:
- topic (string)
- academic_level (string)
- plagiarism_score (float between 0 and 1)

Plagiarism score rubric:
0.0–0.2 → original, personal, or transactional text
0.2–0.4 → lightly structured or templated
0.4–0.6 → strongly templated academic or boilerplate
0.6–0.8 → likely copied or AI-assisted
0.8–1.0 → near-verbatim or highly repetitive
- research_suggestions (array)

Each research_suggestion MUST be an object with:
{{
  "source_id": number,
  "source_title": string,
  "reason": string
}}

NO markdown.
NO explanations.
JSON ONLY.
"""

    payload = {
        "model": "qwen2.5:7b",
        "prompt": prompt,
        "stream": False,
        "format": "json"
    }

    try:
        response = httpx.post(url, json=payload, timeout=120.0)
        response.raise_for_status()
        result = response.json()

        llm_response_text = result.get("response", "").strip()

        if llm_response_text.startswith("```"):
            llm_response_text = llm_response_text.strip("`")

        return json.loads(llm_response_text)

    except Exception as e:
        print(f"LLM Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
def filter_suggestions_by_sources(suggestions: list[str], sources: list[models.AcademicSource]) -> list[str]:
    source_text = " ".join([s.title + " " + s.content for s in sources]).lower()

    filtered = []
    for suggestion in suggestions:
        # keep suggestion only if it shares keywords with sources
        if any(word in source_text for word in suggestion.lower().split()):
            filtered.append(suggestion)

    # fallback if everything got filtered out
    return filtered if filtered else suggestions[:2]

def validate_rag_suggestions(suggestions, sources):
    source_ids = {s.id for s in sources}
    validated = []

    for s in suggestions:
        if s.get("source_id") in source_ids:
            validated.append(s)

    return validated

@app.post("/analyze-assignment", response_model=AnalyzeResponse)
def analyze_assignment(request: AnalyzeRequest, db: Session = Depends(auth.get_db)):
    assignment = db.query(models.Assignment).filter(models.Assignment.id == request.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    original_text = assignment.original_text
    if not original_text:
        raise HTTPException(status_code=400, detail="Assignment has no text content to analyze")
    
    # RAG Retrieval
    relevant_sources = utils.retrieve_relevant_sources(original_text, db)
    
    # Analyze with RAG
    analysis_data = analyze_with_llm(original_text, relevant_sources)
    
    # Save results
    assignment.topic = analysis_data.get("topic")
    assignment.academic_level = analysis_data.get("academic_level")
    
    # Logic: If no validated suggestions, plagiarism score must be low (0.0)
    raw_score = analysis_data.get("plagiarism_score", 0.0)
    
    raw_suggestions = analysis_data.get("research_suggestions", [])
    validated_suggestions = validate_rag_suggestions(raw_suggestions, relevant_sources)
    assignment.research_suggestions = validated_suggestions

    if not validated_suggestions:
        assignment.plagiarism_score = 0.0
    else:
        assignment.plagiarism_score = raw_score
    
    db.commit()
    db.refresh(assignment)
    
    return AnalyzeResponse(
        topic=assignment.topic,
        academic_level=assignment.academic_level,
        plagiarism_score=assignment.plagiarism_score,
        research_suggestions=assignment.research_suggestions
    )
