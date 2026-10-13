# Academic Assignment Helper & Plagiarism Detector

A full-stack web app where students upload a PDF assignment and get an AI analysis back: the topic, the academic level, a plagiarism likelihood score, and research suggestions taken only from a curated library of academic sources.

It uses retrieval-augmented generation (RAG) with a local LLM, so it runs without paid AI APIs and uploaded documents never leave the machine.

<!-- Add screenshots here, for example:![Upload screen](docs/screenshots/upload.png)![Analysis results](docs/screenshots/results.png)-->

* * *

## Features

* **Student accounts** with registration, login and JWT authentication (passwords hashed with bcrypt)
* **PDF upload** from a React dashboard, stored on a shared Docker volume
* **Automated processing pipeline in n8n**: webhook → read file → extract PDF text → save to PostgreSQL → trigger analysis
* **RAG retrieval**: the assignment text is embedded with `nomic-embed-text` (768 dimensions) and the 5 most similar sources are pulled from PostgreSQL using pgvector cosine distance
* **LLM analysis** with Qwen 2.5 7B (via Ollama) that returns strict JSON: topic, academic level, plagiarism score from 0 to 1 (with a defined rubric) and research suggestions
* **Guardrails against hallucination**: every suggestion is checked against the IDs of the sources that were actually retrieved. If none pass, the plagiarism score is set to 0 so the app never flags plagiarism it cannot back up with a source
* **One-command setup** with Docker Compose: React frontend (served by nginx), FastAPI backend, PostgreSQL + pgvector and n8n

* * *

## Architecture

    flowchart LR
        U["Student browserReact + Vite"] -->|"login (JWT), PDF upload"| B["FastAPI backend"]
        B -->|"save PDF"| V[("Shared /data volume")]
        B -->|"webhook"| N["n8n workflow"]
        N -->|"read + extract text"| V
        N -->|"store text"| P[("PostgreSQL + pgvector")]
        N -->|"POST /analyze-assignment"| B
        B -->|"similarity search"| P
        B -->|"embeddings + JSON analysis"| O["Ollamanomic-embed-text, qwen2.5:7b"]
        B -->|"topic, level, score, suggestions"| U

### How an analysis works

1. The student logs in and uploads a PDF.
2. The backend saves the file, creates an `assignments` record and calls the n8n webhook.
3. n8n reads the PDF, extracts the text and writes it to the assignment record.
4. The analysis endpoint embeds the text and retrieves the 5 closest academic sources from pgvector.
5. The LLM compares the assignment with those sources only and returns JSON.
6. The backend validates the suggestions, stores the result and the frontend shows the score bar and suggestions.

* * *

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Axios, nginx |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic, python-jose (JWT), passlib/bcrypt, httpx |
| Database | PostgreSQL with the pgvector extension |
| AI  | Ollama: `qwen2.5:7b` for analysis, `nomic-embed-text` for embeddings |
| Automation | n8n (webhook, file read, PDF extraction, Postgres update, HTTP request) |
| DevOps | Docker, Docker Compose |

* * *

## Getting started

### Prerequisites

* Docker and Docker Compose
* [Ollama](https://ollama.com) running on the host machine, with both models pulled:

    ollama pull qwen2.5:7b
    ollama pull nomic-embed-text

### 1. Clone the repository

    git clone https://github.com/michaelnigusse2/Academic-Assignment-Plagiarism-Checker.git
    cd Academic-Assignment-Plagiarism-Checker

### 2. Create a `.env` file in the project root

    DATABASE_URL=postgresql://student:password@postgres:5432/academic_helper
    JWT_SECRET_KEY=change-me-to-a-long-random-string
    N8N_WEBHOOK_URL=http://n8n:5678/webhook/assignment
    OLLAMA_BASE_URL=http://host.docker.internal:11434

> On Linux, `host.docker.internal` is not available by default. Add `extra_hosts: ["host.docker.internal:host-gateway"]` to the `backend` service in `docker-compose.yml`.

### 3. Start the stack

    docker-compose up --build -d

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API (Swagger docs at `/docs`) | http://localhost:8000 |
| n8n | http://localhost:5678 |
| PostgreSQL | localhost:5432 |

### 4. Seed the academic source library

This embeds the built-in library of academic sources and stores them in pgvector (runs once; it skips if sources already exist):

    docker-compose exec backend python seed_sources.py

### 5. Set up the n8n workflow

1. Open http://localhost:5678.
2. Import `workflows/Assignment Analysis Workflow.json`.
3. Add a Postgres credential: host `postgres`, database `academic_helper`, user `student`, password `password`.
4. Activate the workflow.

### 6. Use the app

Open http://localhost:3000, register an account, log in and upload a PDF assignment.

* * *

## API reference

| Method | Endpoint | Auth | Body | Description |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | No  | `{ "email", "password", "full_name" }` | Create a student account |
| POST | `/auth/login` | No  | `{ "email", "password" }` | Returns `{ "access_token", "token_type" }` |
| POST | `/upload` | Bearer token | `multipart/form-data` with `file` | Saves the PDF and starts the n8n pipeline |
| POST | `/analyze-assignment` | No (see roadmap) | `{ "assignment_id" }` | Runs the RAG analysis and stores the result |

Example `/analyze-assignment` response:

    {
      "topic": "Game theory in economics",
      "academic_level": "Undergraduate",
      "plagiarism_score": 0.62,
      "research_suggestions": [
        {
          "source_id": 5,
          "source_title": "Game Theory in Economic Decision Making",
          "reason": "Closely matches the assignment's explanation of strategic interaction."
        }
      ]
    }

* * *

## Project structure

    .
    ├── backend/
    │   ├── main.py            # FastAPI app, routes, RAG analysis and validation
    │   ├── auth.py            # Password hashing, JWT creation and verification
    │   ├── models.py          # SQLAlchemy models (students, assignments, academic_sources)
    │   ├── database.py        # Database engine and session
    │   ├── utils.py           # Ollama embeddings and pgvector similarity search
    │   ├── seed_sources.py    # Embeds and loads the academic source library
    │   └── Dockerfile
    ├── frontend/
    │   ├── src/
    │   │   ├── components/    # Login, Register, Dashboard, UploadForm, AnalysisResult
    │   │   ├── api.js         # Axios client
    │   │   └── auth.js        # Token storage helpers
    │   ├── nginx.conf
    │   └── Dockerfile         # Multi-stage build: Node build, nginx serve
    ├── workflows/
    │   └── Assignment Analysis Workflow.json   # n8n pipeline
    ├── data/
    │   ├── academic_sources.json
    │   └── uploads/           # Uploaded PDFs
    └── docker-compose.yml

* * *

## Limitations and roadmap

**Current limitations**

* The plagiarism score is an AI estimate based on similarity to the seeded academic library, not a web-wide or Turnitin-style check.
* Only the first 3,000 characters of an assignment are analyzed.
* PDF is the only supported format.

**Planned improvements**

* Require authentication on `/analyze-assignment`
* Store uploads under unique file names to avoid collisions
* Run analysis as a background job with status polling
* Assignment history page for each student
* Automated tests and restricted CORS for production

* * *

## Author

**Michael Nigusse**, full-stack developer (React, Node.js, Python, FastAPI).

Available for freelance work on [Upwork](https://www.upwork.com/freelancers/~017d17f980cf07c3cc).
