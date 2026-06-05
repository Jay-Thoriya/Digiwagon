// Small typed wrapper around the FastAPI backend.
// Everything the UI needs goes through these functions.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface Review {
  id: number;
  review: string;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  categories: string[];
  // True for canonical demo reviews - the UI hides their delete button.
  is_seed: boolean;
}

export interface Summary {
  total_reviews: number;
  sentiment_breakdown: Record<string, number>;
  top_categories: { category: string; count: number }[];
}

export interface SearchResult {
  answer: string;
  source_review_ids: number[];
  retrieved_reviews: { id: number; review: string }[];
}

export interface AgentReport {
  executive_summary: string;
  health_score: number;
  sentiment_metrics: Record<string, number>;
  top_complaints: string[];
  top_praises: string[];
  recommendations: string[];
  report_saved_at: string;
}

// Single place that talks to the network, so errors are handled the same way.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...options,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail || `Request failed (${res.status})`);
  }
  // 204 No Content (e.g. DELETE) - return undefined, parsed as T.
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getSummary: () => request<Summary>("/summary"),

  getReviews: (sentiment?: string, category?: string) => {
    const params = new URLSearchParams();
    if (sentiment) params.set("sentiment", sentiment);
    if (category) params.set("category", category);
    const qs = params.toString();
    return request<Review[]>(`/reviews${qs ? `?${qs}` : ""}`);
  },

  // Analyse a review without saving it (live preview).
  analyze: (review: string) =>
    request<Review>("/analyze", {
      method: "POST",
      body: JSON.stringify({ id: 0, review }),
    }),

  // Add a review to the dataset; the server assigns the id.
  addReview: (review: string) =>
    request<Review>("/reviews", {
      method: "POST",
      body: JSON.stringify({ review }),
    }),

  // Delete a user-added review. Seed reviews are protected server-side (403).
  deleteReview: (id: number) =>
    request<void>(`/reviews/${id}`, { method: "DELETE" }),

  search: (query: string) =>
    request<SearchResult>("/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  runAgent: () => request<AgentReport>("/agent/run", { method: "POST" }),

  getAgentReport: () => request<AgentReport>("/agent/report"),
};
