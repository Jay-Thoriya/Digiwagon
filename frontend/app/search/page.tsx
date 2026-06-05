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
          className="flex-1 rounded-lg border border-edge bg-panel px-4 py-2.5 text-slate-200 outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
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
            className="rounded-full border border-edge px-3 py-1 text-xs text-slate-400 hover:border-accent hover:text-accent"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && (
        <div className="card border-rose-500/40 text-rose-300">{error}</div>
      )}

      {result && (
        <div className="space-y-4 rise">
          <div className="card card-hover">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
              Answer
            </h2>
            <p className="leading-relaxed text-slate-100">{result.answer}</p>
            {result.source_review_ids.length > 0 && (
              <p className="mt-3 text-sm text-slate-400">
                Sources:{" "}
                {result.source_review_ids.map((id) => (
                  <span key={id} className="badge mr-1 bg-accent/10 text-accent">
                    review {id}
                  </span>
                ))}
              </p>
            )}
          </div>

          {result.retrieved_reviews.length > 0 && (
            <div className="card card-hover">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
                Retrieved reviews
              </h2>
              <ul className="space-y-2">
                {result.retrieved_reviews.map((r) => (
                  <li key={r.id} className="rounded-lg border border-edge/60 p-3">
                    <span className="mr-2 text-slate-500">#{r.id}</span>
                    <span className="text-slate-200">{r.review}</span>
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
