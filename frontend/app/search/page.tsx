"use client";

import { useState } from "react";
import { api, SearchResult } from "@/lib/api";
import { PageHeader } from "@/components/ui";

const EXAMPLES = [
  "Which reviews mention delayed delivery?",
  "What do customers say about packaging?",
  "Is the product good value for money?",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.search(q));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rise">
        <PageHeader
          title="Semantic Search"
          subtitle="Ask a question in plain English. Answers are grounded in the reviews."
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Which reviews mention delayed delivery?"
          className="input-base flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setQuery(ex);
              runSearch(ex);
            }}
            className="rounded-full border border-edge bg-white px-3.5 py-1.5 text-xs text-stone-500 shadow-soft transition hover:border-amber-300 hover:bg-accent-light hover:text-amber-800"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4 rise">
          <div className="card card-hover">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Answer
            </h2>
            <p className="leading-relaxed text-stone-800">{result.answer}</p>
            {result.source_review_ids.length > 0 && (
              <p className="mt-3 text-sm text-stone-500">
                Sources:{" "}
                {result.source_review_ids.map((id) => (
                  <span key={id} className="badge mr-1 bg-accent-light text-amber-800 ring-1 ring-amber-200">
                    review {id}
                  </span>
                ))}
              </p>
            )}
          </div>

          {result.retrieved_reviews.length > 0 && (
            <div className="card card-hover">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
                Retrieved reviews
              </h2>
              <ul className="space-y-2">
                {result.retrieved_reviews.map((r) => (
                  <li key={r.id} className="rounded-xl border border-edge bg-stone-50/60 p-3.5 transition hover:bg-stone-50">
                    <span className="mr-2 font-medium text-stone-400">#{r.id}</span>
                    <span className="text-stone-700">{r.review}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
