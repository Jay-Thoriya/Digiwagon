"use client";

import { useState } from "react";
import { api, Review } from "@/lib/api";
import { SentimentBadge } from "@/components/ui";

// Lets a visitor try the full pipeline: type a review, see it analysed live,
// then save it so it shows up in the table, charts and search.
export default function AddReview({ onAdded }: { onAdded: () => void }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function analyze() {
    if (!text.trim()) return;
    setBusy(true);
    setNote("");
    try {
      setPreview(await api.analyze(text));
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!text.trim()) return;
    setBusy(true);
    setNote("");
    try {
      const saved = await api.addReview(text);
      setNote(`Saved as review #${saved.id}.`);
      setText("");
      setPreview(null);
      onAdded(); // refresh the table + counts
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-hover space-y-4">
      <h2 className="text-lg font-semibold text-stone-800">Try it — analyse a review</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="e.g. The delivery was quick but the box was damaged on arrival."
        className="input-base w-full resize-none"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={analyze}
          disabled={busy || !text.trim()}
          className="btn-secondary"
        >
          Analyse
        </button>
        <button
          onClick={save}
          disabled={busy || !text.trim()}
          className="btn-primary"
        >
          Add to dataset
        </button>
        {note && <span className="text-sm text-stone-500">{note}</span>}
      </div>

      {preview && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-stone-50 px-4 py-3 text-sm">
          <SentimentBadge sentiment={preview.sentiment} />
          <span className="text-stone-500">
            confidence {preview.confidence.toFixed(2)}
          </span>
          {preview.categories.map((c) => (
            <span key={c} className="badge bg-accent-light text-amber-800 ring-1 ring-amber-200">{c}</span>
          ))}
          {preview.categories.length === 0 && (
            <span className="text-stone-400">no categories matched</span>
          )}
        </div>
      )}
    </div>
  );
}
