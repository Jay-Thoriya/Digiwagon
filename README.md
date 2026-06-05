# Smart Review Intelligence Platform

Ingests customer reviews, analyses sentiment + category, answers natural-language
questions over them with a RAG pipeline, and runs a small AI agent that produces
a business-insight report.

**Stack:** FastAPI · SQLite · FAISS · Next.js + Recharts · OpenRouter · sentence-transformers / fastembed.

---

## Live Demo

| | URL |
|---|---|
| **Frontend (Vercel)** | https://smart-review-beta.vercel.app |
| **Backend API (Render)** | https://smart-review-api-l9rd.onrender.com |
| **API docs (Swagger)** | https://smart-review-api-l9rd.onrender.com/docs# |

---

## What's inside

```
Digiwogan/
├── backend/          FastAPI app
│   ├── app/
│   │   ├── main.py             app setup, startup (seed + index), /health
│   │   ├── config.py           settings from .env
│   │   ├── database.py         SQLAlchemy engine + session
│   │   ├── models.py           Review + AgentReport tables
│   │   ├── schemas.py          Pydantic request/response models
│   │   ├── seed.py             the six example reviews
│   │   ├── api/routes.py       all endpoints
│   │   └── services/
│   │       ├── sentiment.py    Part 1 - VADER + keyword categories
│   │       ├── embeddings.py   pluggable embedder (ST / fastembed)
│   │       ├── rag.py          Part 2 - FAISS retrieval + grounded answer
│   │       ├── llm.py          OpenRouter client
│   │       └── agent.py        Part 3 - insight agent (fetch/summarise/store)
│   ├── tests/                  pytest unit + API tests
│   ├── Dockerfile              slim image for deployment
│   └── render.yaml             one-click Render blueprint
└── frontend/         Next.js app
    ├── app/                    Dashboard / Reviews / Search / Agent pages
    ├── components/             nav + shared UI
    └── lib/api.ts              typed backend client
```

---

## Run it locally

You need **Python 3.11+** and **Node 18+**. Run the two apps in separate terminals.

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate           # Windows
# source venv/bin/activate      # macOS / Linux

pip install -r requirements.txt   # local: sentence-transformers (all-MiniLM)
# pip install -r requirements-deploy.txt   # lighter: fastembed (ONNX)

copy .env.example .env            # then add your OPENROUTER_API_KEY
uvicorn app.main:app --reload
```

The API runs at http://127.0.0.1:8000 (docs at `/docs`). On first start it
creates the SQLite DB, seeds the six example reviews, and builds the FAISS index.

> Without an `OPENROUTER_API_KEY`, Part 1 and retrieval still work fully —
> `/search` returns the matching reviews with a fallback message, and
> `/agent/run` returns a clear error. Add a key to enable generated answers.

### 2. Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm run dev
```

Open http://localhost:3000.

### 3. Tests

```bash
cd backend
pytest
```

---

## The UI (4 pages)

- **Dashboard** — totals, a sentiment donut chart and a top-categories bar chart (`/summary`).
- **Reviews** — every review in a filterable table, plus a *“Try it”* box where you can
  type a review, see it analysed live, and save it into the dataset (`/analyze`, `/reviews`).
- **Search** — ask a question, see the grounded answer plus the source review ids (`/search`).
- **Agent Report** — one button runs the agent, then shows an **executive summary**, a
  **customer health score (0–100)** gauge, complaints, praises, recommendations, and a
  history of previous runs (`/agent/run`, `/agent/reports`).

---

## API endpoints

Full request/response examples are in the interactive docs at `<backend-url>/docs`.

| Method | Path | Notes |
|---|---|---|
| `POST` | `/analyze` | Analyse one review (no save) |
| `POST` | `/bulk-analyze` | Analyse + store many reviews |
| `POST` | `/reviews` | **(added)** Add one review, server assigns the id |
| `GET` | `/reviews` | List reviews, filter by `sentiment` / `category` |
| `DELETE` | `/reviews/{id}` | **(added)** Delete a user-added review (seed reviews are protected) |
| `GET` | `/summary` | Totals, sentiment breakdown, top categories |
| `POST` | `/search` | RAG semantic search with a grounded answer |
| `POST` | `/agent/run` | Run the insight agent |
| `GET` | `/agent/report` | Latest report |
| `GET` | `/agent/reports` | **(added)** Recent report history |
| `GET` | `/health` | Liveness check |

## Environment variables (backend)

| Variable | Default | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | _(empty)_ | Key from https://openrouter.ai/keys |
| `LLM_MODEL_NAME` | `meta-llama/llama-3.3-70b-instruct:free` | OpenRouter model for RAG + agent |
| `SENTIMENT_BACKEND` | `vader` | `vader` (fast, offline) or `llm` (more accurate, needs a key) |
| `EMBEDDING_BACKEND` | `auto` | `auto` / `sentence-transformers` / `fastembed` |
| `RETRIEVAL_THRESHOLD` | `0.35` | Minimum cosine similarity to keep a review |
| `RETRIEVAL_TOP_K` | `4` | How many reviews to retrieve |
| `DATABASE_URL` | `sqlite:///./reviews.db` | SQLite path |
| `FAISS_INDEX_PATH` | `./faiss_index.bin` | Where the vector index is saved |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins (your Vercel URL in prod) |

Frontend uses a single variable: `NEXT_PUBLIC_API_URL`.

---

## Architecture decisions

- **Sentiment (Part 1):** VADER + keyword categories by default — offline, no key,
  deterministic. Made **emoji-aware** (👍 😡 💔 🔥 …) by expanding common symbols to
  sentiment words before scoring; this fixes cases plain VADER misses (a bare 👍
  scores neutral, 😡💔 scores *positive*). Set `SENTIMENT_BACKEND=llm` to use the
  LLM instead — batches `/bulk-analyze` into one call and falls back to VADER on
  failure. A review can fall into several categories.
- **Embeddings (Part 2):** `all-MiniLM-L6-v2` behind an `Embedder` that picks
  `sentence-transformers` locally and `fastembed` (ONNX) on deploy. Same 384-dim
  vectors either way, so the FAISS index is identical.
- **Vector store:** FAISS `IndexFlatIP` over L2-normalised vectors = cosine similarity.
  Persisted to disk; rebuilt on review add/delete.
- **Grounding:** retrieval drops anything below `RETRIEVAL_THRESHOLD`. If nothing
  qualifies, the API returns a fallback message instead of a guessed answer. The
  prompt restricts the model to the given context.
- **Agent (Part 3):** explicit four-step loop — `fetch_reviews`, `compute_metrics`,
  `summarise_themes` (LLM with retries), `store_report`. The health score is
  derived from the data, not the LLM, so it is always trustworthy.
- **LLM:** OpenRouter via a thin `httpx` client (OpenAI-compatible API). One free
  model covers both RAG answers and agent reasoning.

---

## Known limitations

- SQLite + on-disk FAISS suit a small/medium dataset; at scale you'd move to
  Postgres and a managed vector DB (Pinecone/Weaviate).
- Rule-based sentiment can misjudge sarcasm or mixed-topic reviews.
- No auth or rate limiting on the API.
- The agent report is overwritten each run; only the latest is returned by
  `/agent/report` (history is kept in the `agent_reports` table).
