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
  const [history, setHistory] = useState<AgentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Show the previous report + history when the page loads.
  useEffect(() => {
    api.getAgentReport().then(setReport).catch(() => {});
    refreshHistory();
  }, []);

  function refreshHistory() {
    api.getAgentReports().then(setHistory).catch(() => {});
  }

  async function run() {
    setLoading(true);
    setError("");
    try {
      setReport(await api.runAgent());
      refreshHistory();
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
          className="shrink-0 rounded-lg bg-accent px-5 py-2.5 font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Running agent…" : "Run agent"}
        </button>
      </div>

      {error && <div className="card border-rose-500/40 text-rose-300">{error}</div>}

      {!report && !loading && (
        <div className="card text-slate-400">
          No report yet. Click <span className="text-accent">Run agent</span> to generate one.
        </div>
      )}

      {report && (
        <div className="space-y-4 rise">
          {/* Headline: executive summary + health score gauge */}
          <div className="card card-hover grid items-center gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-slate-400">
                Executive summary
              </h2>
              <p className="leading-relaxed text-slate-100">
                {report.executive_summary || "—"}
              </p>
              <div className="mt-3 flex gap-4 text-sm text-slate-400">
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

          {history.length > 1 && (
            <div className="card card-hover">
              <h2 className="mb-3 font-medium text-white">Report history</h2>
              <ul className="divide-y divide-edge/60 text-sm">
                {history.map((r, i) => (
                  <li key={i} className="flex items-center justify-between py-2">
                    <span className="text-slate-400">
                      {new Date(r.report_saved_at).toLocaleString()}
                    </span>
                    <span className="font-medium" style={{ color: scoreColor(r.health_score) }}>
                      {r.health_score}/100
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-right text-xs text-slate-500">
            Generated at {new Date(report.report_saved_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return "#34d399"; // healthy
  if (score >= 40) return "#fbbf24"; // mixed
  return "#fb7185"; // at risk
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
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#232a3a" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-white">{score}</span>
        <span className="text-xs" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <span>
      <span className="text-slate-200">{value ?? 0}%</span> {label}
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
    tone === "positive" ? "bg-emerald-400" : tone === "negative" ? "bg-rose-400" : "bg-accent";

  return (
    <div className="card card-hover">
      <h2 className="mb-3 font-medium text-white">{title}</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-slate-200">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{item}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-slate-500">None.</li>}
      </ul>
    </div>
  );
}
