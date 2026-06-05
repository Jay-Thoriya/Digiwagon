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
    <div className="card card-hover space-y-3">
      <h2 className="text-lg font-medium text-white">Try it — analyse a review</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="e.g. The delivery was quick but the box was damaged on arrival."
        className="w-full resize-none rounded-lg border border-edge bg-ink px-3 py-2 text-slate-200 outline-none focus:border-accent"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={analyze}
          disabled={busy || !text.trim()}
          className="rounded-lg border border-edge px-4 py-2 text-sm text-slate-200 transition hover:border-accent disabled:opacity-50"
        >
          Analyse
        </button>
        <button
          onClick={save}
          disabled={busy || !text.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
        >
          Add to dataset
        </button>
        {note && <span className="text-sm text-slate-400">{note}</span>}
      </div>

      {preview && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-edge/60 bg-ink/60 px-3 py-2 text-sm">
          <SentimentBadge sentiment={preview.sentiment} />
          <span className="text-slate-400">
            confidence {preview.confidence.toFixed(2)}
          </span>
          {preview.categories.map((c) => (
            <span key={c} className="badge bg-accent/10 text-accent">{c}</span>
          ))}
          {preview.categories.length === 0 && (
            <span className="text-slate-500">no categories matched</span>
          )}
        </div>
      )}
    </div>
  );
}
