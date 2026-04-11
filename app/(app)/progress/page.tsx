"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Scale,
  Ruler,
  Activity,
  Calendar,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ── Types ──────────────────────────────────────────────────
interface ProgressEntry {
  id: string;
  weightKg: string | null;
  bodyFatPct: string | null;
  chest: string | null;
  waist: string | null;
  hips: string | null;
  arms: string | null;
  thighs: string | null;
  notes: string | null;
  recordedAt: string;
}

interface LatestGoal {
  target: string;
  deadline: string | null;
  daysLeft: number | null;
}

// ── Helpers ────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── Component ──────────────────────────────────────────────
export default function ProgressPage() {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [latestGoal, setLatestGoal] = useState<LatestGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [form, setForm] = useState({
    weightKg: "",
    bodyFatPct: "",
    chest: "",
    waist: "",
    hips: "",
    arms: "",
    thighs: "",
    notes: "",
  });

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/me/progress");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? data);
      }

      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setLatestGoal(me.latestGoal ?? null);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v.trim()) body[k] = v.trim();
      }
      const res = await fetch("/api/me/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setForm({
          weightKg: "",
          bodyFatPct: "",
          chest: "",
          waist: "",
          hips: "",
          arms: "",
          thighs: "",
          notes: "",
        });
        setDialogOpen(false);
        fetchEntries();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived data ───────────────────────────────────────
  const latest = entries[0] ?? null;
  const previous = entries[1] ?? null;
  const last5 = entries.slice(0, 5).reverse();

  const weightDiff =
    latest?.weightKg && previous?.weightKg
      ? Number(latest.weightKg) - Number(previous.weightKg)
      : null;

  const TrendIcon =
    weightDiff === null
      ? Minus
      : weightDiff > 0
        ? TrendingUp
        : weightDiff < 0
          ? TrendingDown
          : Minus;

  const trendColor =
    weightDiff === null
      ? "text-gray-500"
      : weightDiff > 0
        ? "text-[#F97C00]"
        : weightDiff < 0
          ? "text-[#02CB00]"
          : "text-gray-500";

  // ── Mini chart helpers ─────────────────────────────────
  const weights = last5
    .map((e) => (e.weightKg ? Number(e.weightKg) : null))
    .filter((w): w is number => w !== null);
  const minW = weights.length ? Math.min(...weights) - 2 : 0;
  const maxW = weights.length ? Math.max(...weights) + 2 : 100;
  const range = maxW - minW || 1;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full max-w-[480px] mx-auto px-4 pb-28 pt-2">
      {/* Hero Section */}
      <div
        className="glass rounded-2xl p-6 mb-6 animate-fade-up"
        style={{ animationFillMode: "both" }}
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
        ) : latest?.weightKg ? (
          <>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
              Current Weight
            </p>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold text-gradient-blue leading-none">
                {Number(latest.weightKg).toFixed(1)}
              </span>
              <span className="text-lg text-gray-500 mb-1">kg</span>
              <div className={`flex items-center gap-1 mb-1 ml-auto ${trendColor}`}>
                <TrendIcon className="size-5" />
                {weightDiff !== null && (
                  <span className="text-sm font-medium">
                    {weightDiff > 0 ? "+" : ""}
                    {weightDiff.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            {latest.bodyFatPct && (
              <div className="flex items-center gap-2 mt-3">
                <Activity className="size-4 text-[#00E5FF]" />
                <span className="text-sm text-gray-500">Body Fat</span>
                <span className="text-sm font-semibold text-gray-900 ml-auto">
                  {Number(latest.bodyFatPct).toFixed(1)}%
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <Scale className="size-10 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No data yet</p>
          </div>
        )}
      </div>

      {/* Goal + deadline snapshot */}
      {!loading && latestGoal?.target && (
        <div
          className="glass rounded-2xl p-5 mb-6 animate-fade-up delay-1"
          style={{ animationFillMode: "both", opacity: 0 }}
        >
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
            Latest Active Goal
          </p>
          <p className="text-sm font-semibold text-gray-900 mb-2">
            {latestGoal.target}
          </p>
          {latestGoal.deadline && (
            <p className="text-xs text-gray-600">
              Deadline {fmtDate(latestGoal.deadline)}
              <span className="ml-2 font-medium text-[#0057FF]">
                ({
                  latestGoal.daysLeft === null
                    ? "-"
                    : latestGoal.daysLeft < 0
                      ? `${Math.abs(latestGoal.daysLeft)}d overdue`
                      : latestGoal.daysLeft === 0
                        ? "Due today"
                        : `${latestGoal.daysLeft}d left`
                })
              </span>
            </p>
          )}
        </div>
      )}

      {/* Mini Weight Chart */}
      {!loading && weights.length >= 2 && (
        <div
          className="glass rounded-2xl p-5 mb-6 animate-fade-up delay-1"
          style={{ animationFillMode: "both", opacity: 0 }}
        >
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">
            Weight Trend
          </p>
          <div className="flex items-end gap-2 h-24">
            {last5.map((entry, i) => {
              const w = entry.weightKg ? Number(entry.weightKg) : null;
              const pct = w !== null ? ((w - minW) / range) * 100 : 0;
              return (
                <div key={entry.id} className="flex-1 flex flex-col items-center gap-1">
                  {w !== null && (
                    <span className="text-[10px] text-gray-500">
                      {w.toFixed(0)}
                    </span>
                  )}
                  <div className="w-full flex items-end justify-center h-16">
                    <div
                      className="w-full max-w-[28px] rounded-t-md transition-all duration-500"
                      style={{
                        height: `${Math.max(pct, 8)}%`,
                        background:
                          i === last5.length - 1
                            ? "linear-gradient(to top, #0057FF, #3B82F6)"
                            : "rgba(0, 87, 255, 0.25)",
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-500">
                    {new Date(entry.recordedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline header */}
      <div
        className="flex items-center gap-2 mb-3 animate-fade-up delay-2"
        style={{ animationFillMode: "both", opacity: 0 }}
      >
        <Calendar className="size-4 text-[#0057FF]" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
          Timeline
        </h2>
        <span className="text-xs text-gray-500 ml-auto">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div
          className="glass rounded-2xl p-8 text-center animate-fade-up delay-2"
          style={{ animationFillMode: "both", opacity: 0 }}
        >
          <Dumbbell className="size-12 text-[#0057FF] mx-auto mb-4 animate-float" />
          <h3 className="text-lg font-semibold mb-2">Start Your Journey</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Every rep counts. Log your first progress entry and watch your
            transformation unfold.
          </p>
        </div>
      )}

      {/* Timeline entries */}
      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const isExpanded = expandedId === entry.id;
            const measurements = [
              { label: "Chest", value: entry.chest, unit: "cm" },
              { label: "Waist", value: entry.waist, unit: "cm" },
              { label: "Hips", value: entry.hips, unit: "cm" },
              { label: "Arms", value: entry.arms, unit: "cm" },
              { label: "Thighs", value: entry.thighs, unit: "cm" },
            ].filter((m) => m.value);

            return (
              <button
                key={entry.id}
                type="button"
                className={`glass rounded-2xl p-4 w-full text-left card-hover animate-fade-up cursor-pointer`}
                style={{
                  animationDelay: `${0.05 * Math.min(idx, 10)}s`,
                  animationFillMode: "both",
                  opacity: 0,
                }}
                onClick={() =>
                  setExpandedId(isExpanded ? null : entry.id)
                }
              >
                {/* Header row */}
                <div className="flex items-center justify-between min-h-[44px]">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-[#0057FF]/10 flex items-center justify-center shrink-0">
                      <Scale className="size-5 text-[#0057FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {fmtDate(entry.recordedAt)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fmtRelative(entry.recordedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.weightKg && (
                      <span className="text-lg font-bold text-gray-900">
                        {Number(entry.weightKg).toFixed(1)}
                        <span className="text-xs text-gray-500 ml-0.5">
                          kg
                        </span>
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="size-4 text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 animate-fade-in space-y-3">
                    {entry.bodyFatPct && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                          <Activity className="size-3.5 text-[#00E5FF]" />
                          Body Fat
                        </span>
                        <span className="text-sm font-medium">
                          {Number(entry.bodyFatPct).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {measurements.map((m) => (
                      <div
                        key={m.label}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                          <Ruler className="size-3.5 text-[#0057FF]" />
                          {m.label}
                        </span>
                        <span className="text-sm font-medium">
                          {Number(m.value).toFixed(1)} {m.unit}
                        </span>
                      </div>
                    ))}
                    {entry.notes && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 italic">
                          {entry.notes}
                        </p>
                      </div>
                    )}
                    {!entry.bodyFatPct &&
                      measurements.length === 0 &&
                      !entry.notes && (
                        <p className="text-xs text-gray-500 italic">
                          No additional measurements recorded.
                        </p>
                      )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-20 right-4 z-40 size-14 rounded-full flex items-center justify-center btn-electric animate-pulse-glow shadow-lg cursor-pointer"
        aria-label="Log Progress"
      >
        <Plus className="size-6 relative z-10" />
      </button>

      {/* Log Progress Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-gradient-blue text-lg">
              Log Progress
            </DialogTitle>
            <DialogDescription>
              Record your latest measurements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Weight + Body Fat row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">
                  Weight (kg)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="72.5"
                  className="h-11"
                  value={form.weightKg}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, weightKg: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">
                  Body Fat %
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="18.0"
                  className="h-11"
                  value={form.bodyFatPct}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bodyFatPct: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Measurements */}
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                Measurements (cm)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["chest", "Chest"],
                    ["waist", "Waist"],
                    ["hips", "Hips"],
                    ["arms", "Arms"],
                    ["thighs", "Thighs"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-gray-500">
                      {label}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="—"
                      className="h-11"
                      value={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Notes</Label>
              <Textarea
                placeholder="How are you feeling?"
                className="min-h-[80px]"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>

            {/* Submit */}
            <Button
              className="w-full h-12 btn-electric rounded-xl text-base font-semibold"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
