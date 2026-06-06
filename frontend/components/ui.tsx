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
    <div className="card border-red-200 bg-red-50 text-red-700">
      <p className="font-semibold">Couldn't reach the API.</p>
      <p className="text-sm text-red-600/80">{message}</p>
      <p className="mt-2 text-sm text-stone-500">
        Is the backend running, and is NEXT_PUBLIC_API_URL set correctly?
      </p>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">{title}</h1>
      <p className="mt-1 text-stone-500">{subtitle}</p>
    </div>
  );
}
