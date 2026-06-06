"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

// Parses a user-uploaded JSON file, validates the shape, assigns fresh ids,
// and pushes the batch through /bulk-analyze.
//
// Accepted formats:
//   1) An array:      [{ "review": "..." }, ...]
//   2) An object:     { "reviews": [{ "review": "..." }, ...] }
//
// Any "id" field in the uploaded JSON is ignored - the server-side seed
// reviews would clash with user ids, so we always re-assign client-side.
export default function UploadReviews({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<string[] | null>(null);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [noteTone, setNoteTone] = useState<"info" | "error" | "success">("info");

  function reset() {
    setParsed(null);
    setFilename("");
    setNote("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function fail(msg: string) {
    setNote(msg);
    setNoteTone("error");
    setParsed(null);
  }

  async function handleFile(file: File) {
    setFilename(file.name);
    setNote("");
    let raw: string;
    try {
      raw = await file.text();
    } catch {
      return fail("Couldn’t read that file.");
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return fail("That doesn’t look like valid JSON.");
    }

    // Accept either a bare array or { reviews: [...] }.
    const arr = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.reviews)
        ? (data as any).reviews
        : null;
    if (!arr) {
      return fail('Expected a JSON array, or an object with a "reviews" array.');
    }

    const texts: string[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const text = typeof item === "string" ? item : item?.review;
      if (typeof text !== "string" || !text.trim()) {
        return fail(`Item ${i + 1} is missing a non-empty "review" string.`);
      }
      texts.push(text.trim());
    }
    if (texts.length === 0) {
      return fail("The file is valid JSON but contains zero reviews.");
    }

    setParsed(texts);
    setNote(`Parsed ${texts.length} review${texts.length === 1 ? "" : "s"}. Ready to import.`);
    setNoteTone("info");
  }

  async function importNow() {
    if (!parsed) return;
    setBusy(true);
    setNote("");
    try {
      // Assign ids that won’t collide with what’s already in the DB.
      const existing = await api.getReviews();
      const maxId = existing.reduce((m, r) => Math.max(m, r.id), 0);
      const payload = parsed.map((review, i) => ({ id: maxId + 1 + i, review }));

      const inserted = await api.bulkAnalyze(payload);
      setNote(`Imported ${inserted.length} reviews (ids ${payload[0].id}–${payload[payload.length - 1].id}).`);
      setNoteTone("success");
      setParsed(null);
      setFilename("");
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (e) {
      fail((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const noteColor =
    noteTone === "error"
      ? "text-red-600"
      : noteTone === "success"
        ? "text-emerald-700"
        : "text-stone-500";

  return (
    <div className="card card-hover space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Bulk import reviews</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            Upload a JSON file with multiple reviews. New to the format?{" "}
            <a
              href="/sample-reviews.json"
              download="sample-reviews.json"
              className="font-medium text-accent hover:underline"
            >
              Download a sample file
            </a>
            .
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="block w-full max-w-xs cursor-pointer rounded-xl border border-edge bg-white text-sm
                     text-stone-600 file:mr-3 file:cursor-pointer file:rounded-l-xl file:border-0
                     file:bg-accent-light file:px-4 file:py-2.5 file:text-sm file:font-semibold
                     file:text-amber-800 hover:file:bg-amber-200"
        />

        <button
          onClick={importNow}
          disabled={busy || !parsed}
          className="btn-primary"
        >
          {busy ? "Importing…" : "Import"}
        </button>

        {(parsed || note) && (
          <button onClick={reset} disabled={busy} className="btn-secondary">
            Reset
          </button>
        )}
      </div>

      {(filename || note) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {filename && (
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
              {filename}
            </span>
          )}
          {note && <span className={noteColor}>{note}</span>}
        </div>
      )}
    </div>
  );
}
