"use client";

import { useEffect, useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Render free-tier dynos sleep after ~15 min idle and take 30-60 s to wake.
// To avoid the dashboard looking broken on the first visit, we ping /health
// on mount: if it doesn't come back fast, we show a friendly amber banner
// explaining the wait. The banner disappears as soon as the API responds.
export default function WakeupNotice() {
  const [state, setState] = useState<"idle" | "waking" | "ready" | "down">("idle");

  useEffect(() => {
    let cancelled = false;

    // If /health hasn't replied in 1.5 s we assume the dyno is asleep.
    const timer = setTimeout(() => {
      if (!cancelled) setState("waking");
    }, 1500);

    fetch(`${BASE_URL}/health`, { cache: "no-store" })
      .then((r) => {
        if (cancelled) return;
        clearTimeout(timer);
        setState(r.ok ? "ready" : "down");
      })
      .catch(() => {
        if (cancelled) return;
        clearTimeout(timer);
        setState("waking"); // keep showing - retry will fire below
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Keep retrying every 5 s while we're in the waking state. As soon as the
  // backend answers, we flip to "ready" and the banner disappears.
  useEffect(() => {
    if (state !== "waking") return;
    let cancelled = false;

    const id = setInterval(() => {
      fetch(`${BASE_URL}/health`, { cache: "no-store" })
        .then((r) => {
          if (cancelled) return;
          if (r.ok) setState("ready");
        })
        .catch(() => { });
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [state]);

  if (state !== "waking") return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-2.5 text-sm text-amber-900">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
        <span>
          <strong className="font-semibold">Getting things ready…</strong>{" "}
          Just a moment — first load takes a few seconds, then everything is instant.
        </span>
      </div>
    </div>
  );
}
