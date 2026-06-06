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
  positive: "#16A34A",
  negative: "#DC2626",
  neutral: "#9CA3AF",
};

// Light-mode tooltip: white card with warm shadow.
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const label = point.payload?.category ?? point.name;
  const color = point.payload?.fill ?? "#D97706";
  return (
    <div className="rounded-xl border border-edge bg-white px-4 py-2.5 text-sm shadow-card-hover">
      <span
        className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
        style={{ background: color }}
      />
      <span className="capitalize text-stone-700">{label}</span>
      <span className="ml-2 font-bold text-stone-900">{point.value}</span>
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
  if (!summary) return <p className="text-stone-400">Loading dashboard…</p>;

  const sentimentData = Object.entries(summary.sentiment_breakdown).map(
    ([name, value]) => ({ name, value })
  );

  return (
    <div className="space-y-8">
      <div className="rise">
        <PageHeader title="Dashboard" subtitle="Overview of all analysed reviews." />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total reviews" value={summary.total_reviews} color="#D97706" delay={0} />
        <Stat label="Positive" value={summary.sentiment_breakdown.positive ?? 0} color="#16A34A" delay={60} />
        <Stat label="Negative" value={summary.sentiment_breakdown.negative ?? 0} color="#DC2626" delay={120} />
        <Stat label="Neutral" value={summary.sentiment_breakdown.neutral ?? 0} color="#9CA3AF" delay={180} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card card-hover rise" style={{ animationDelay: "240ms" }}>
          <h2 className="mb-4 text-lg font-semibold text-stone-800">Sentiment breakdown</h2>
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
                  <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] ?? "#D4D4D4"} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <Legend data={sentimentData} />
        </div>

        <div className="card card-hover rise" style={{ animationDelay: "300ms" }}>
          <h2 className="mb-4 text-lg font-semibold text-stone-800">Top categories</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.top_categories} layout="vertical">
              <XAxis type="number" stroke="#A8A29E" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="category"
                stroke="#A8A29E"
                width={120}
                tick={{ fontSize: 12, fill: "#78716C" }}
              />
              <Tooltip cursor={{ fill: "#F5F5F4" }} content={<ChartTooltip />} />
              <Bar dataKey="count" fill="#D97706" radius={[0, 6, 6, 0]} />
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
      {/* Thin colored accent bar on top */}
      <div className="mb-3 h-1 w-10 rounded-full" style={{ background: color }} />
      <div className="text-4xl font-bold text-stone-900">{value}</div>
      <div className="mt-1 text-sm text-stone-500">{label}</div>
    </div>
  );
}

function Legend({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="mt-4 flex justify-center gap-5 text-sm">
      {data.map((d) => (
        <span key={d.name} className="flex items-center gap-1.5 text-stone-500">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: SENTIMENT_COLORS[d.name] ?? "#D4D4D4" }}
          />
          {d.name}
        </span>
      ))}
    </div>
  );
}
