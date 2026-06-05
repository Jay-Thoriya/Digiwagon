"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, Summary } from "@/lib/api";
import { ErrorBox, PageHeader } from "@/components/ui";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#34d399",
  negative: "#fb7185",
  neutral: "#94a3b8",
};

// Shared tooltip for both charts: a colored dot + readable light text.
// (The recharts default colours the label by slice, which reads as muddy on
// a dark panel.) Works for the pie (name + fill) and the bar (category).
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const label = point.payload?.category ?? point.name;
  const color = point.payload?.fill ?? "#5b8cff";
  return (
    <div className="rounded-lg border border-edge bg-[#0f1420] px-3 py-2 text-sm shadow-xl shadow-black/40">
      <span
        className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
        style={{ background: color }}
      />
      <span className="capitalize text-slate-200">{label}</span>
      <span className="ml-2 font-semibold text-white">{point.value}</span>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSummary().then(setSummary).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!summary) return <p className="text-slate-400">Loading dashboard…</p>;

  const sentimentData = Object.entries(summary.sentiment_breakdown).map(
    ([name, value]) => ({ name, value })
  );

  return (
    <div className="space-y-8">
      <div className="rise">
        <PageHeader title="Dashboard" subtitle="Overview of all analysed reviews." />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total reviews" value={summary.total_reviews} color="#5b8cff" delay={0} />
        <Stat label="Positive" value={summary.sentiment_breakdown.positive ?? 0} color="#34d399" delay={60} />
        <Stat label="Negative" value={summary.sentiment_breakdown.negative ?? 0} color="#fb7185" delay={120} />
        <Stat label="Neutral" value={summary.sentiment_breakdown.neutral ?? 0} color="#94a3b8" delay={180} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card card-hover rise" style={{ animationDelay: "240ms" }}>
          <h2 className="mb-4 text-lg font-medium text-white">Sentiment breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sentimentData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={3}
              >
                {sentimentData.map((entry) => (
                  <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] ?? "#64748b"} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <Legend data={sentimentData} />
        </div>

        <div className="card card-hover rise" style={{ animationDelay: "300ms" }}>
          <h2 className="mb-4 text-lg font-medium text-white">Top categories</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.top_categories} layout="vertical">
              <XAxis type="number" stroke="#64748b" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="category"
                stroke="#64748b"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip cursor={{ fill: "#ffffff10" }} content={<ChartTooltip />} />
              <Bar dataKey="count" fill="#5b8cff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  return (
    <div className="card card-hover rise" style={{ animationDelay: `${delay}ms` }}>
      {/* a thin colored accent bar on top of each stat */}
      <div className="mb-3 h-1 w-10 rounded-full" style={{ background: color }} />
      <div className="text-4xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </div>
  );
}

function Legend({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="mt-4 flex justify-center gap-5 text-sm">
      {data.map((d) => (
        <span key={d.name} className="flex items-center gap-1.5 text-slate-400">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: SENTIMENT_COLORS[d.name] ?? "#64748b" }}
          />
          {d.name}
        </span>
      ))}
    </div>
  );
}
