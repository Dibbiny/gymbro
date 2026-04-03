"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { TrendingUp, BarChart2 } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  category: string;
}

interface SetPoint {
  date: string;
  maxWeight: number;
  volume: number;
}

interface WeeklyVolume {
  week: string;
  [category: string]: number | string;
}

interface Props {
  exercises: Exercise[];
  weeklyVolume: WeeklyVolume[];
}

const CATEGORY_COLORS: Record<string, string> = {
  CHEST: "#ef4444",
  BACK: "#3b82f6",
  LEGS: "#22c55e",
  SHOULDERS: "#f59e0b",
  ARMS: "#a855f7",
  CORE: "#ec4899",
  CARDIO: "#14b8a6",
  OTHER: "#94a3b8",
};

export function ProgressCharts({ exercises, weeklyVolume }: Props) {
  const [selectedId, setSelectedId] = useState(exercises[0]?.id ?? "");
  const [metric, setMetric] = useState<"maxWeight" | "volume">("maxWeight");
  const [data, setData] = useState<SetPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/history/sets?exerciseId=${selectedId}`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const categories = Array.from(
    new Set(weeklyVolume.flatMap((w) => Object.keys(w).filter((k) => k !== "week")))
  );

  return (
    <div className="space-y-8">
      {/* Exercise progress */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" /> Exercise Progress
        </h2>

        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm outline-none focus:border-primary flex-1 min-w-0"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
          <div className="flex gap-1">
            {(["maxWeight", "volume"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  metric === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {m === "maxWeight" ? "Max Weight" : "Volume"}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>}

        {!loading && data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No data for this exercise yet</p>
        )}

        {!loading && data.length > 0 && (
          <div className="rounded-xl border border-border p-3">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => [
                    metric === "maxWeight" ? `${v} kg` : `${v} kg·reps`,
                    metric === "maxWeight" ? "Max Weight" : "Volume",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Weekly muscle group volume */}
      {weeklyVolume.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4" /> Weekly Volume by Muscle Group
          </h2>
          <div className="rounded-xl border border-border p-3">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyVolume} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {categories.map((cat) => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat] ?? "#94a3b8"} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
