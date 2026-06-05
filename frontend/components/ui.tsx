// Small shared presentational bits used across pages.

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const cls =
    sentiment === "positive"
      ? "badge-positive"
      : sentiment === "negative"
        ? "badge-negative"
        : "badge-neutral";
  return <span className={`badge ${cls}`}>{sentiment}</span>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="card border-rose-500/40 text-rose-300">
      <p className="font-medium">Couldn’t reach the API.</p>
      <p className="text-sm text-rose-300/80">{message}</p>
      <p className="mt-2 text-sm text-slate-400">
        Is the backend running, and is NEXT_PUBLIC_API_URL set correctly?
      </p>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
      <p className="mt-1 text-slate-400">{subtitle}</p>
    </div>
  );
}
