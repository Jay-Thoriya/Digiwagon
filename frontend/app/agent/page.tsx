"use client";

import { useEffect, useState } from "react";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import { api, AgentReport } from "@/lib/api";
import { PageHeader } from "@/components/ui";

export default function AgentPage() {
  const [report, setReport] = useState<AgentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Show the previous report when the page loads (if one exists).
  useEffect(() => {
    api.getAgentReport().then(setReport).catch(() => {});
  }, []);

  async function run() {
    setLoading(true);
    setError("");
    try {
      setReport(await api.runAgent());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 rise">
        <PageHeader
          title="Agent Report"
          subtitle="The agent reads every review and writes an insight report."
        />
        <button
          onClick={run}
          disabled={loading}
          className="btn-primary shrink-0"
        >
          {loading ? "Running agent…" : "Run agent"}
        </button>
      </div>

      {error && <div className="card border-red-200 bg-red-50 text-red-700">{error}</div>}

      {!report && !loading && (
        <div className="card text-stone-500">
          No report yet. Click <span className="font-semibold text-accent">Run agent</span> to generate one.
        </div>
      )}

      {report && (
        <div className="space-y-4 rise">
          {/* Headline: executive summary + health score gauge */}
          <div className="card card-hover grid items-center gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-stone-400">
                Executive summary
              </h2>
              <p className="leading-relaxed text-stone-700">
                {report.executive_summary || "—"}
              </p>
              <div className="mt-3 flex gap-4 text-sm text-stone-500">
                <Metric label="Positive" value={report.sentiment_metrics.positive} />
                <Metric label="Neutral" value={report.sentiment_metrics.neutral} />
                <Metric label="Negative" value={report.sentiment_metrics.negative} />
              </div>
            </div>
            <HealthGauge score={report.health_score} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CardList title="Top complaints" items={report.top_complaints} tone="negative" />
            <CardList title="Top praises" items={report.top_praises} tone="positive" />
          </div>

          <CardList title="Recommendations" items={report.recommendations} tone="accent" />

          <p className="text-right text-xs text-stone-400">
            Generated at {new Date(report.report_saved_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return "#16A34A"; // healthy – green
  if (score >= 40) return "#D97706"; // mixed – amber
  return "#DC2626"; // at risk – red
}

function HealthGauge({ score }: { score: number }) {
  const color = scoreColor(score);
  const label = score >= 70 ? "Healthy" : score >= 40 ? "Mixed" : "At risk";
  const data = [{ value: score, fill: color }];

  return (
    <div className="relative h-[140px] w-[140px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#F5F5F4" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-stone-800">{score}</span>
        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <span>
      <span className="font-semibold text-stone-700">{value ?? 0}%</span> {label}
    </span>
  );
}

function CardList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "negative" | "accent";
}) {
  const dot =
    tone === "positive" ? "bg-emerald-500" : tone === "negative" ? "bg-red-500" : "bg-accent";

  return (
    <div className="card card-hover">
      <h2 className="mb-3 font-semibold text-stone-800">{title}</h2>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-stone-600">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{item}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-stone-400">None.</li>}
      </ul>
    </div>
  );
}
