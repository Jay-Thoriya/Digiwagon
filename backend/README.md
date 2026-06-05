# Smart Review Intelligence Platform

A backend that ingests customer product reviews, analyses them for sentiment
and category, answers natural-language questions over them with a RAG pipeline,
and runs a small AI agent that produces a business-insight report.

**Stack:** FastAPI · SQLite + SQLAlchemy · FAISS · OpenRouter · VADER ·
sentence-transformers (local) / fastembed (deploy).

---

## Live Demo

| | URL |
|---|---|
| **API** | https://smart-review-api-l9rd.onrender.com |
| **Interactive docs (Swagger)** | https://smart-review-api-l9rd.onrender.com/docs |

> Hosted on Render's free tier — the first request after 15 min of idleness
> takes ~30–60 s to wake up. Hit `/health` once to warm it.

---

## Setup

### Prerequisites

- Python 3.11+
- `pip` and `venv`

### 1. Clone

```bash
git clone https://github.com/Jay-Thoriya/smart-review-api.git
cd smart-review-api
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate      # macOS / Linux
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

> For a deployment that needs to fit in 512 MB RAM (Render free tier etc.),
> use `requirements-deploy.txt` instead — it swaps `sentence-transformers`
> (pulls in torch) for `fastembed` (ONNX, ~10× smaller). Same model, same
> 384-dim vectors, identical FAISS index.

### 4. Configure environment variables

```bash
cp .env.example .env
# Open .env and add your OPENROUTER_API_KEY
```

A free key is available at https://openrouter.ai/keys.

### 5. Run the server

```bash
uvicorn app.main:app --reload
```

API at http://127.0.0.1:8000 · Docs at http://127.0.0.1:8000/docs

On first startup the database is created, 24 seed reviews are loaded, and the
FAISS index is built.

### 6. Run the tests

```bash
pytest
```

20 tests covering sentiment (including emoji handling), the agent's health
score, the create/delete endpoints, and the seed-protection rules.

---

## Environment Variables

See `.env.example` for the full list.

| Variable | Default | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | _(empty)_ | Free key from https://openrouter.ai/keys |
| `LLM_MODEL_NAME` | `openai/gpt-oss-120b:free` | Any OpenRouter model |
| `SENTIMENT_BACKEND` | `vader` | `vader` (offline, fast) or `llm` (more accurate) |
| `EMBEDDING_BACKEND` | `auto` | `auto` / `sentence-transformers` / `fastembed` |
| `RETRIEVAL_THRESHOLD` | `0.35` | Minimum cosine similarity for retrieval |
| `RETRIEVAL_TOP_K` | `4` | Reviews retrieved per query |
| `DATABASE_URL` | `sqlite:///./reviews.db` | SQLite path |
| `FAISS_INDEX_PATH` | `./faiss_index.bin` | Where the vector index is saved |
| `AGENT_REPORT_PATH` | `./agent_report.json` | Where the agent JSON report is saved |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |

---

## API Reference

Full request/response examples are in the Swagger docs at `/docs`.

### Part 1 — Review Analysis

| Method | Path | Description |
|---|---|---|
| `POST` | `/analyze` | Analyse a single review (no save) |
| `POST` | `/bulk-analyze` | Analyse and store many reviews |
| `POST` | `/reviews` | Add one review, server assigns the id |
| `GET` | `/reviews` | List reviews, filter by `sentiment` and/or `category` |
| `DELETE` | `/reviews/{id}` | Delete a user-added review (seed reviews are protected) |
| `GET` | `/summary` | Totals, sentiment breakdown, top categories |

### Part 2 — Semantic Search (RAG)

| Method | Path | Description |
|---|---|---|
| `POST` | `/search` | Natural-language question, grounded answer + source review ids |

### Part 3 — AI Agent

| Method | Path | Description |
|---|---|---|
| `POST` | `/agent/run` | Generate a fresh insight report (overwrites previous) |
| `GET` | `/agent/report` | Latest report |

### Meta

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |

---

## Architecture Decisions

### Sentiment Analysis & Category Detection (Part 1)

- **Default (VADER):** offline, deterministic, no API key, microsecond-fast.
- **Emoji-aware:** common symbols (👍 😡 💔 🔥 …) are expanded to sentiment
  words before scoring. This fixes cases plain VADER misses — a bare 👍
  scores neutral, 😡💔 scores *positive* — without giving up VADER's speed.
- **LLM option:** set `SENTIMENT_BACKEND=llm` to use OpenRouter. Batches a
  whole `/bulk-analyze` into one call and falls back to VADER on failure.
- **Categories:** keyword matching against six themes (`product_quality`,
  `delivery`, `packaging`, `price`, `customer_support`, `usability`). A review
  can belong to several categories.

### Embedding Model (Part 2)

- **Model:** `sentence-transformers/all-MiniLM-L6-v2` (384-dim).
- **Two backends:** `sentence-transformers` locally (heavier, pulls in
  torch), `fastembed` (ONNX) on deploy. Identical model, identical vectors,
  identical FAISS index. Chosen by the `EMBEDDING_BACKEND` env var.

### Vector Store (Part 2)

- **Choice:** FAISS `IndexFlatIP` over L2-normalised vectors. Inner product
  on unit vectors is exactly cosine similarity.
- **Persistence:** the index is saved to disk and reloaded on startup; it
  rebuilds in a background task whenever reviews are added or deleted.

### Database (Part 1)

- **Choice:** SQLite + SQLAlchemy ORM. No server process, ideal for a
  single-instance app and the assessment scale.

### Agent Framework (Part 3)

- **Choice:** custom lightweight loop (the spec allows this explicitly).
  Four tools: `fetch_reviews`, `compute_metrics` (deterministic, no LLM),
  `summarise_themes` (LLM with linear-backoff retries, max 3 attempts), and
  `store_report` (writes to both the JSON file and the database).
- **Health score** is computed from the sentiment mix, not the LLM, so the
  number is always trustworthy. The LLM only produces the qualitative summary.

### Hallucination Reduction (Part 2 — Bonus)

- **Retrieval threshold:** only reviews with cosine similarity ≥
  `RETRIEVAL_THRESHOLD` (default 0.35) are passed to the LLM.
- **Prompt constraints:** the prompt explicitly restricts the model to the
  provided reviews and tells it to say it doesn't have enough information
  rather than guess.
- **Fallback response:** if no review passes the threshold, the API returns
  *"No relevant reviews were found for this query."* instead of letting the
  LLM hallucinate.
- **Graceful degradation:** if the LLM call itself fails, the retrieved
  reviews are still returned so the client gets something useful.

---

## Known Limitations

- SQLite is fine for this scale but unsuitable for high-concurrency
  production workloads — Postgres would be the next step.
- The FAISS index is loaded in memory; for very large datasets a managed
  vector DB (Pinecone, Weaviate) would be more appropriate.
- The rule-based sentiment path can misclassify sarcasm or mixed-topic
  reviews. The LLM backend (opt-in) handles these better.
- The agent does not stream — a `/agent/run` call blocks until the report
  is complete.
- No authentication or rate limiting on the API.

---

## Assumptions

- Review `id` values are caller-supplied unique integers.
- The six seed reviews from the assessment are pre-loaded on first startup
  (along with 18 additional realistic reviews so the dashboard and agent
  report have enough signal).
- A review can belong to multiple categories.
- The agent report is overwritten each time `POST /agent/run` is called;
  only the latest report is retained.
- The `.env` file is the single source of truth for configuration; no
  values are hard-coded.
