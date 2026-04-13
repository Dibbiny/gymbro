"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MuscleData {
  lastTrainedAt: string | null;
  recoveryPercent: number;
  hoursAgo: number | null;
}

type MuscleMap = Record<string, MuscleData>;

function getColor(data: MuscleData | undefined): string {
  if (!data?.lastTrainedAt) return "var(--muted-foreground)";
  if (data.recoveryPercent >= 70) return "#22c55e";
  if (data.recoveryPercent >= 35) return "#f59e0b";
  return "#ef4444";
}

function getOpacity(data: MuscleData | undefined): number {
  if (!data?.lastTrainedAt) return 0.18;
  return 0.72;
}

function formatTimeAgo(hoursAgo: number | null): string {
  if (hoursAgo === null) return "Not trained recently";
  if (hoursAgo < 1) return "< 1h ago";
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const d = Math.floor(hoursAgo / 24);
  const h = hoursAgo % 24;
  return h > 0 ? `${d}d ${h}h ago` : `${d}d ago`;
}

const MUSCLE_META: { key: string; label: string }[] = [
  { key: "CHEST", label: "Chest" },
  { key: "BACK", label: "Back" },
  { key: "SHOULDERS", label: "Shoulders" },
  { key: "ARMS", label: "Arms" },
  { key: "CORE", label: "Core" },
  { key: "LEGS", label: "Legs" },
];

// ─── SVG Body Maps ────────────────────────────────────────────────────────────

interface BodyProps {
  muscles: MuscleMap;
  hovered: string | null;
  onHover: (key: string | null) => void;
}

function muscleProps(key: string, muscles: MuscleMap, hovered: string | null) {
  const data = muscles[key];
  return {
    fill: getColor(data),
    fillOpacity: hovered === key ? 0.95 : getOpacity(data),
    style: { cursor: "pointer", transition: "fill-opacity 0.15s" },
  };
}

function FrontBody({ muscles, hovered, onHover }: BodyProps) {
  const mp = (key: string) => ({
    ...muscleProps(key, muscles, hovered),
    onMouseEnter: () => onHover(key),
    onMouseLeave: () => onHover(null),
    onTouchStart: () => onHover(key),
  });

  return (
    <svg viewBox="0 0 140 295" className="w-full max-w-[170px] mx-auto">
      {/* ── Structural silhouette (non-interactive, muted) ── */}
      <circle cx="70" cy="20" r="16" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="62" y="36" width="16" height="10" rx="4" fill="currentColor" className="text-muted-foreground/20" />
      {/* torso */}
      <rect x="36" y="46" width="68" height="82" rx="10" fill="currentColor" className="text-muted-foreground/20" />
      <ellipse cx="70" cy="134" rx="30" ry="13" fill="currentColor" className="text-muted-foreground/20" />
      {/* arms */}
      <rect x="8" y="46" width="24" height="62" rx="11" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="108" y="46" width="24" height="62" rx="11" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="11" y="111" width="18" height="40" rx="8" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="111" y="111" width="18" height="40" rx="8" fill="currentColor" className="text-muted-foreground/20" />
      {/* legs */}
      <rect x="38" y="145" width="28" height="72" rx="13" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="74" y="145" width="28" height="72" rx="13" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="40" y="220" width="24" height="60" rx="11" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="76" y="220" width="24" height="60" rx="11" fill="currentColor" className="text-muted-foreground/20" />

      {/* ── SHOULDERS ── */}
      <ellipse cx="20" cy="60" rx="14" ry="13" {...mp("SHOULDERS")} />
      <ellipse cx="120" cy="60" rx="14" ry="13" {...mp("SHOULDERS")} />

      {/* ── CHEST ── */}
      <ellipse cx="70" cy="80" rx="30" ry="19" {...mp("CHEST")} />

      {/* ── ARMS (biceps) ── */}
      <rect x="10" y="62" width="20" height="38" rx="9" {...mp("ARMS")} />
      <rect x="110" y="62" width="20" height="38" rx="9" {...mp("ARMS")} />

      {/* ── CORE ── */}
      <rect x="44" y="99" width="52" height="42" rx="10" {...mp("CORE")} />

      {/* ── LEGS (quads) ── */}
      <ellipse cx="52" cy="183" rx="14" ry="30" {...mp("LEGS")} />
      <ellipse cx="88" cy="183" rx="14" ry="30" {...mp("LEGS")} />

      {/* ── LEGS (calves) ── */}
      <ellipse cx="52" cy="246" rx="10" ry="22" {...mp("LEGS")} />
      <ellipse cx="88" cy="246" rx="10" ry="22" {...mp("LEGS")} />
    </svg>
  );
}

function BackBody({ muscles, hovered, onHover }: BodyProps) {
  const mp = (key: string) => ({
    ...muscleProps(key, muscles, hovered),
    onMouseEnter: () => onHover(key),
    onMouseLeave: () => onHover(null),
    onTouchStart: () => onHover(key),
  });

  return (
    <svg viewBox="0 0 140 295" className="w-full max-w-[170px] mx-auto">
      {/* ── Structural silhouette ── */}
      <circle cx="70" cy="20" r="16" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="62" y="36" width="16" height="10" rx="4" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="36" y="46" width="68" height="82" rx="10" fill="currentColor" className="text-muted-foreground/20" />
      <ellipse cx="70" cy="134" rx="30" ry="13" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="8" y="46" width="24" height="62" rx="11" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="108" y="46" width="24" height="62" rx="11" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="11" y="111" width="18" height="40" rx="8" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="111" y="111" width="18" height="40" rx="8" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="38" y="145" width="28" height="72" rx="13" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="74" y="145" width="28" height="72" rx="13" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="40" y="220" width="24" height="60" rx="11" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="76" y="220" width="24" height="60" rx="11" fill="currentColor" className="text-muted-foreground/20" />

      {/* ── SHOULDERS (rear delts) ── */}
      <ellipse cx="20" cy="60" rx="14" ry="13" {...mp("SHOULDERS")} />
      <ellipse cx="120" cy="60" rx="14" ry="13" {...mp("SHOULDERS")} />

      {/* ── BACK (traps) ── */}
      <rect x="42" y="52" width="56" height="26" rx="8" {...mp("BACK")} />

      {/* ── BACK (lats) ── */}
      <ellipse cx="44" cy="96" rx="18" ry="28" {...mp("BACK")} />
      <ellipse cx="96" cy="96" rx="18" ry="28" {...mp("BACK")} />

      {/* ── BACK (lower) ── */}
      <ellipse cx="70" cy="126" rx="14" ry="13" {...mp("BACK")} />

      {/* ── ARMS (triceps) ── */}
      <rect x="10" y="62" width="20" height="38" rx="9" {...mp("ARMS")} />
      <rect x="110" y="62" width="20" height="38" rx="9" {...mp("ARMS")} />

      {/* ── LEGS (glutes) ── */}
      <ellipse cx="52" cy="157" rx="18" ry="14" {...mp("LEGS")} />
      <ellipse cx="88" cy="157" rx="18" ry="14" {...mp("LEGS")} />

      {/* ── LEGS (hamstrings) ── */}
      <ellipse cx="52" cy="192" rx="13" ry="28" {...mp("LEGS")} />
      <ellipse cx="88" cy="192" rx="13" ry="28" {...mp("LEGS")} />

      {/* ── LEGS (calves) ── */}
      <ellipse cx="52" cy="246" rx="10" ry="22" {...mp("LEGS")} />
      <ellipse cx="88" cy="246" rx="10" ry="22" {...mp("LEGS")} />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MuscleHeatmap() {
  const [muscles, setMuscles] = useState<MuscleMap | null>(null);
  const [view, setView] = useState<"front" | "back">("front");
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/history/muscle-recovery")
      .then((r) => r.json())
      .then((d) => setMuscles(d.muscles));
  }, []);

  const hoveredData = hovered && muscles ? muscles[hovered] : null;
  const hoveredMeta = MUSCLE_META.find((m) => m.key === hovered);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Muscle Recovery</CardTitle>
          <div className="flex rounded-lg overflow-hidden border border-border text-xs font-medium">
            <button
              onClick={() => setView("front")}
              className={`px-3 py-1 transition-colors ${
                view === "front" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Front
            </button>
            <button
              onClick={() => setView("back")}
              className={`px-3 py-1 transition-colors ${
                view === "back" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Back
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hover info panel */}
        <div className={`rounded-lg px-3 py-2 text-xs min-h-[40px] transition-all ${
          hovered ? "bg-muted" : "bg-transparent"
        }`}>
          {hovered && hoveredData ? (
            <div className="flex items-center justify-between">
              <span className="font-semibold">{hoveredMeta?.label}</span>
              <span className="text-muted-foreground">
                {hoveredData.lastTrainedAt
                  ? `${hoveredData.recoveryPercent}% recovered · ${formatTimeAgo(hoveredData.hoursAgo)}`
                  : "Not trained recently"}
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground text-center">Hover a muscle to see details</p>
          )}
        </div>

        {/* Body SVG */}
        {muscles === null ? (
          <div className="h-60 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : view === "front" ? (
          <FrontBody muscles={muscles} hovered={hovered} onHover={setHovered} />
        ) : (
          <BackBody muscles={muscles} hovered={hovered} onHover={setHovered} />
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
            Ready
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            Recovering
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            Fatigued
          </span>
        </div>

        {/* Muscle grid */}
        <div className="grid grid-cols-3 gap-2">
          {MUSCLE_META.map(({ key, label }) => {
            const data = muscles[key];
            const color = getColor(data);
            return (
              <div
                key={key}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                className={`rounded-lg p-2 text-center cursor-pointer transition-colors ${
                  hovered === key ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: color }}
                />
                <p className="text-xs font-medium leading-none">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {data?.lastTrainedAt
                    ? `${data.recoveryPercent}%`
                    : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
