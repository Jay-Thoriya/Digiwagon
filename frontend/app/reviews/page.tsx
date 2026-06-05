"use client";

import { useEffect, useState } from "react";
import { api, Review } from "@/lib/api";
import { ErrorBox, PageHeader, SentimentBadge } from "@/components/ui";
import AddReview from "@/components/AddReview";

const CATEGORIES = [
  "product_quality",
  "delivery",
  "packaging",
  "price",
  "customer_support",
  "usability",
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sentiment, setSentiment] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleDelete(id: number) {
    if (!confirm(`Delete review #${id}? This can't be undone.`)) return;
    try {
      await api.deleteReview(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    setLoading(true);
    api
      .getReviews(sentiment, category)
      .then(setReviews)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sentiment, category, refreshKey]);

  return (
    <div className="space-y-6">
      <div className="rise">
        <PageHeader title="Reviews" subtitle="All stored reviews, with filters." />
      </div>

      <div className="rise" style={{ animationDelay: "60ms" }}>
        <AddReview onAdded={() => setRefreshKey((k) => k + 1)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select label="Sentiment" value={sentiment} onChange={setSentiment}
          options={["positive", "negative", "neutral"]} />
        <Select label="Category" value={category} onChange={setCategory}
          options={CATEGORIES} />
      </div>

      {error && <ErrorBox message={error} />}

      <div className="card overflow-hidden p-0 rise" style={{ animationDelay: "120ms" }}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-edge text-slate-400">
            <tr>
              <th className="p-3 w-12">ID</th>
              <th className="p-3">Review</th>
              <th className="p-3 w-28">Sentiment</th>
              <th className="p-3 w-20">Conf.</th>
              <th className="p-3">Categories</th>
              <th className="p-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr
                key={r.id}
                className="border-b border-edge/50 transition-colors last:border-0 hover:bg-white/[0.02]"
              >
                <td className="p-3 text-slate-500">{r.id}</td>
                <td className="p-3 text-slate-200">{r.review}</td>
                <td className="p-3"><SentimentBadge sentiment={r.sentiment} /></td>
                <td className="p-3 text-slate-400">{r.confidence.toFixed(2)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {r.categories.map((c) => (
                      <span key={c} className="badge bg-accent/10 text-accent">{c}</span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-right">
                  {!r.is_seed && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      aria-label={`Delete review ${r.id}`}
                      title="Delete review"
                      className="rounded-md px-2 py-1 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && reviews.length === 0 && (
          <p className="p-6 text-center text-slate-500">No reviews match these filters.</p>
        )}
        {loading && <p className="p-6 text-center text-slate-500">Loading…</p>}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-sm text-slate-400">
      <span className="mr-2">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-edge bg-panel px-3 py-1.5 text-slate-200 outline-none focus:border-accent"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
