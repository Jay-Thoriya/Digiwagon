# Smart Review Intelligence Platform

A backend system that ingests customer product reviews, analyses them using AI, supports semantic search via a RAG pipeline, and uses an AI Agent to generate actionable business insights.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Architecture Decisions](#architecture-decisions)
- [Known Limitations](#known-limitations)
- [Assumptions](#assumptions)

---

## Project Overview

The Smart Review Intelligence Platform is an end-to-end AI/ML-powered backend built with FastAPI. It analyses customer product reviews for sentiment and category, enables natural language semantic search over reviews using a RAG pipeline, and runs an autonomous AI Agent to generate structured business insight reports.

---

## Setup Instructions

### Prerequisites

- Python 3.9+
- `pip` and `virtualenv`

### 1. Clone the Repository

```bash
git clone <repository-url>
cd smart-review-intelligence-platform
```

### 2. Create and Activate a Virtual Environment

```bash
python -m venv venv

# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
# Open .env and fill in your actual values
```

### 5. Run the Server

```bash
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

### 6. Access Interactive API Docs

```
http://127.0.0.1:8000/docs
```

---

## Environment Variables

Create a `.env` file in the root directory. Refer to `.env.example` for the full list.

```
# .env.example

# LLM Provider API Key (choose one based on your provider)
GROQ_API_KEY=              # Groq free tier — groq.com
HUGGINGFACE_API_KEY=       # HuggingFace Inference API — huggingface.co
TOGETHER_API_KEY=          # Together AI free credits — together.ai
# If using Ollama locally, no API key is needed.

# LLM model name to use (e.g. llama3-8b-8192 for Groq, mistral for Ollama)
LLM_MODEL_NAME=

# Embedding model name (e.g. sentence-transformers/all-MiniLM-L6-v2)
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2

# SQLite database file path
DATABASE_URL=sqlite:///./reviews.db

# Path to store the FAISS vector index
FAISS_INDEX_PATH=./faiss_index

# Path to store the generated agent report
AGENT_REPORT_PATH=./agent_report.json
```

> **Note:** Never commit your actual `.env` file. It is listed in `.gitignore`. Only `.env.example` should be committed.

---

## API Reference

### Part 1 — Core Review Analysis API

---

#### `POST /analyze`

Analyse a single review for sentiment and category.

**Request Body**

```json
{
  "id": 1,
  "review": "Product quality is excellent. Delivery was fast and packaging was perfect."
}
```

**Response**

```json
{
  "id": 1,
  "review": "Product quality is excellent. Delivery was fast and packaging was perfect.",
  "sentiment": "positive",
  "confidence": 0.95,
  "categories": ["product_quality", "delivery", "packaging"]
}
```

---

#### `POST /bulk-analyze`

Analyse a list of reviews and persist results to the database.

**Request Body**

```json
{
  "reviews": [
    {"id": 1, "review": "Product quality is excellent. Delivery was fast and packaging was perfect."},
    {"id": 2, "review": "Terrible packaging, item arrived damaged. Very disappointed."}
  ]
}
```

**Response**

```json
[
  {
    "id": 1,
    "review": "Product quality is excellent. Delivery was fast and packaging was perfect.",
    "sentiment": "positive",
    "confidence": 0.95,
    "categories": ["product_quality", "delivery", "packaging"]
  },
  {
    "id": 2,
    "review": "Terrible packaging, item arrived damaged. Very disappointed.",
    "sentiment": "negative",
    "confidence": 0.91,
    "categories": ["packaging", "delivery"]
  }
]
```

---

#### `GET /summary`

Get aggregate statistics across all stored reviews.

**Response**

```json
{
  "total_reviews": 6,
  "sentiment_breakdown": {
    "positive": 3,
    "negative": 2,
    "neutral": 1
  },
  "top_categories": [
    {"category": "product_quality", "count": 4},
    {"category": "delivery", "count": 3},
    {"category": "packaging", "count": 2}
  ]
}
```

---

#### `GET /reviews`

List all stored reviews. Supports optional filters.

**Query Parameters**

| Parameter   | Type   | Description                                      |
|-------------|--------|--------------------------------------------------|
| `sentiment` | string | Filter by sentiment: `positive`, `negative`, `neutral` |
| `category`  | string | Filter by category: e.g. `delivery`, `packaging` |

**Example Request**

```
GET /reviews?sentiment=negative&category=delivery
```

**Response**

```json
[
  {
    "id": 2,
    "review": "Terrible packaging, item arrived damaged. Very disappointed.",
    "sentiment": "negative",
    "confidence": 0.91,
    "categories": ["packaging", "delivery"]
  }
]
```

---

### Part 2 — RAG Pipeline for Semantic Search

---

#### `POST /search`

Perform semantic search over stored reviews using a natural language query.

**Request Body**

```json
{
  "query": "Which reviews mention delayed delivery?"
}
```

**Response**

```json
{
  "answer": "Review 3 mentions a delivery delay of 5 days with no updates from support.",
  "source_review_ids": [3, 6],
  "retrieved_reviews": [
    {
      "id": 3,
      "review": "Good product but delivery was delayed by 5 days. No updates from support."
    },
    {
      "id": 6,
      "review": "Super fast delivery. Product looks great but instructions unclear."
    }
  ]
}
```

---

### Part 3 — AI Agent for Insight Generation

---

#### `POST /agent/run`

Trigger the AI Agent to analyse all reviews and generate a structured business insight report.

**Request Body**

```json
{}
```

**Response**

```json
{
  "top_complaints": [
    "Poor packaging leading to damaged items",
    "Delayed delivery with no communication from support"
  ],
  "top_praises": [
    "Excellent product quality",
    "Fast delivery and great value for money"
  ],
  "recommendations": [
    "Improve packaging standards to prevent damage during transit.",
    "Set up automated delivery status notifications for customers.",
    "Provide clearer product instructions or a quick-start guide.",
    "Invest in support team responsiveness for order-related queries."
  ],
  "report_saved_at": "2025-01-01T12:00:00Z"
}
```

---

#### `GET /agent/report`

Retrieve the latest generated agent report.

**Response**

```json
{
  "top_complaints": [
    "Poor packaging leading to damaged items",
    "Delayed delivery with no communication from support"
  ],
  "top_praises": [
    "Excellent product quality",
    "Fast delivery and great value for money"
  ],
  "recommendations": [
    "Improve packaging standards to prevent damage during transit.",
    "Set up automated delivery status notifications for customers.",
    "Provide clearer product instructions or a quick-start guide.",
    "Invest in support team responsiveness for order-related queries."
  ],
  "report_saved_at": "2025-01-01T12:00:00Z"
}
```

---

## Architecture Decisions

### Sentiment Analysis & Category Detection (Part 1)

- **Rule-based fallback:** VADER (via `vaderSentiment`) is used for sentiment detection as it is fast, lightweight, and requires no API key. Category detection is done via keyword matching.
- **LLM option:** If an API key is provided, the LLM is used instead for higher accuracy. The provider is selected via the `.env` configuration.

### Embedding Model (Part 2)

- **Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Reason:** It is free, lightweight, runs locally without an API key, and produces high-quality 384-dimensional embeddings suitable for semantic search over short review texts.

### Vector Store (Part 2)

- **Choice:** FAISS (Facebook AI Similarity Search)
- **Reason:** FAISS is fast, runs fully in-memory or on disk, requires no separate server process, and integrates easily with Python. For the scale of this project (small to medium review datasets), it is more than sufficient.
- Embeddings are automatically updated whenever new reviews are added via `POST /analyze` or `POST /bulk-analyze`.

### Database (Part 1)

- **Choice:** SQLite with SQLAlchemy ORM
- **Reason:** SQLite requires no separate database server and is well-suited for a locally run application. SQLAlchemy provides a clean, schema-driven abstraction over raw SQL.

### Agent Framework (Part 3)

- **Choice:** LangChain (or a custom lightweight agent loop)
- **Reason:** LangChain provides a straightforward way to define tools and chain multi-step reasoning. The agent uses at minimum two tools: `fetch_reviews` (retrieves all reviews from the database) and `store_report` (persists the generated JSON report). Error handling ensures the agent retries on tool failure and stops gracefully to avoid infinite loops.

### Hallucination Reduction (Part 2 — Bonus)

To reduce hallucinations in the RAG pipeline:

- **Confidence threshold on retrieval:** Only reviews with a cosine similarity score above a defined threshold (e.g. 0.6) are passed as context to the LLM. If no review meets the threshold, a fallback message is returned instead of a generated answer.
- **Prompt constraints:** The LLM prompt explicitly instructs the model to answer only based on the provided review context and to state "I don't know" if the context is insufficient.
- **Answer validation:** The response is checked to ensure cited review IDs exist in the retrieved set.
- **Fallback response:** If retrieved context is empty or below threshold, the API returns a structured message indicating no relevant reviews were found, rather than allowing the LLM to hallucinate an answer.

---

## Known Limitations

- The SQLite database is not suitable for high-concurrency production workloads; a PostgreSQL database would be preferred at scale.
- The FAISS index is stored on disk and loaded into memory at startup; for very large datasets, a managed vector database (e.g. Pinecone, Weaviate) would be more appropriate.
- Sentiment and category detection accuracy depends on the chosen approach; the rule-based VADER + keyword matching method may misclassify ambiguous or multi-topic reviews.
- The AI Agent does not support streaming; for long-running analyses the API response may be slow.
- No authentication or rate limiting is implemented on the API endpoints.

---

## Assumptions

- Review `id` values are provided by the caller and are assumed to be unique integers.
- The six seed reviews listed in the assessment are pre-loaded into the database on first startup.
- Category detection allows a single review to belong to multiple categories simultaneously.
- The agent report is overwritten each time `POST /agent/run` is called; only the latest report is retained.
- Ollama, if used, is assumed to be running locally on its default port (`11434`) with the desired model already pulled.
- The `.env` file is the single source of truth for all configuration; no values are hardcoded in the application code.
