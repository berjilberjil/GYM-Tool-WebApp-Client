"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Flame,
  Dumbbell,
  Zap,
  Timer,
  Target,
  Trophy,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ── Types ──────────────────────────────────────────────────
type GoalType = "fat_loss" | "muscle_gain" | "strength" | "endurance" | "general";
type GoalStatus = "active" | "achieved" | "abandoned";

interface Goal {
  id: string;
  type: GoalType;
  target: string;
  status: GoalStatus;
  deadline: string | null;
  createdAt: string;
}

// ── Config ─────────────────────────────────────────────────
const GOAL_TYPE_CONFIG: Record<
  GoalType,
  { label: string; icon: typeof Flame; color: string; bg: string; border: string }
> = {
  fat_loss: {
    label: "Fat Loss",
    icon: Flame,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  muscle_gain: {
    label: "Muscle Gain",
    icon: Dumbbell,
    color: "text-[#0057FF]",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  strength: {
    label: "Strength",
    icon: Zap,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  endurance: {
    label: "Endurance",
    icon: Timer,
    color: "text-[#02CB00]",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  general: {
    label: "General",
    icon: Target,
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-200",
  },
};

const STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className:
      "bg-green-50 text-[#02CB00] border border-green-200",
  },
  achieved: {
    label: "Achieved",
    className:
      "bg-amber-50 text-amber-600 border border-amber-200",
  },
  abandoned: {
    label: "Archived",
    className: "bg-gray-100 text-gray-500 border border-gray-200",
  },
};

type FilterTab = "all" | "active" | "achieved";

// ── Helpers ────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Component ──────────────────────────────────────────────
export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [selectedType, setSelectedType] = useState<GoalType | null>(null);
  const [targetText, setTargetText] = useState("");
  const [deadline, setDeadline] = useState("");

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/me/goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals ?? data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSubmit = async () => {
    if (!selectedType || !targetText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/me/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          target: targetText.trim(),
          deadline: deadline || null,
        }),
      });
      if (res.ok) {
        setSelectedType(null);
        setTargetText("");
        setDeadline("");
        setDialogOpen(false);
        fetchGoals();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveToggle = async (goalId: string, status: GoalStatus) => {
    const action = status === "active" ? "archive" : "activate";
    try {
      const res = await fetch("/api/me/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goalId, action }),
      });
      if (res.ok) {
        await fetchGoals();
      }
    } catch {
      // silently fail
    }
  };

  function deadlineText(goalDeadline: string | null) {
    if (!goalDeadline) return null;
    const now = new Date();
    const end = new Date(goalDeadline);
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
    if (daysLeft === 0) return "Due today";
    return `${daysLeft}d left`;
  }

  // ── Derived ────────────────────────────────────────────
  const activeCount = goals.filter((g) => g.status === "active").length;
  const achievedCount = goals.filter((g) => g.status === "achieved").length;

  const filtered =
    filter === "all"
      ? goals
      : goals.filter((g) => g.status === filter);

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: goals.length },
    { key: "active", label: "Active", count: activeCount },
    { key: "achieved", label: "Achieved", count: achievedCount },
  ];

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full max-w-[480px] mx-auto px-4 pb-28 pt-2">
      {/* Summary bar */}
      <div
        className="flex items-center gap-2 mb-5 animate-fade-up"
        style={{ animationFillMode: "both" }}
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
          <span className="size-2 rounded-full bg-[#02CB00] animate-pulse" />
          <span className="text-xs font-medium text-[#02CB00]">
            {activeCount} Active
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
          <Trophy className="size-3 text-amber-600" />
          <span className="text-xs font-medium text-amber-600">
            {achievedCount} Achieved
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 ml-auto">
          <span className="text-xs font-medium text-gray-500">
            {goals.length} Total
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-2 mb-5 animate-fade-up delay-1"
        style={{ animationFillMode: "both", opacity: 0 }}
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              filter === tab.key
                ? "btn-electric text-white"
                : "glass text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div
          className="glass rounded-2xl p-8 text-center animate-fade-up delay-2"
          style={{ animationFillMode: "both", opacity: 0 }}
        >
          <Sparkles className="size-12 text-[#0057FF] mx-auto mb-4 animate-float" />
          <h3 className="text-lg font-semibold mb-2">
            {filter === "all"
              ? "Set Your First Goal"
              : filter === "active"
                ? "No Active Goals"
                : "No Achievements Yet"}
          </h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            {filter === "all"
              ? "Goals turn dreams into deadlines. Add one and start crushing it."
              : filter === "active"
                ? "All caught up! Add a new goal to keep the momentum going."
                : "Keep pushing. Your first achievement is just around the corner."}
          </p>
        </div>
      )}

      {/* Goal cards */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((goal, idx) => {
            const config = GOAL_TYPE_CONFIG[goal.type];
            const statusCfg = STATUS_CONFIG[goal.status];
            const Icon = config.icon;

            return (
              <div
                key={goal.id}
                className="glass rounded-2xl p-4 card-hover animate-fade-up"
                style={{
                  animationDelay: `${0.05 * Math.min(idx, 10)}s`,
                  animationFillMode: "both",
                  opacity: 0,
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`size-11 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`size-5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge
                        className={`${config.bg} ${config.color} ${config.border} border text-[10px] uppercase tracking-wider`}
                      >
                        {config.label}
                      </Badge>
                      <span
                        className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-900 leading-relaxed mb-2">
                      {goal.target}
                    </p>

                    {goal.deadline && (
                      <p className="text-xs text-gray-600 mb-2">
                        Deadline {fmtDate(goal.deadline)}
                        <span className="ml-2 text-[#0057FF] font-medium">
                          ({deadlineText(goal.deadline)})
                        </span>
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        Created {fmtDate(goal.createdAt)}
                      </p>
                      {(goal.status === "active" || goal.status === "abandoned") && (
                        <button
                          type="button"
                          onClick={() => handleArchiveToggle(goal.id, goal.status)}
                          className="text-xs font-medium text-[#0057FF] hover:underline"
                        >
                          {goal.status === "active" ? "Archive" : "Restore"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-20 right-4 z-40 size-14 rounded-full flex items-center justify-center btn-electric animate-pulse-glow shadow-lg cursor-pointer"
        aria-label="Add Goal"
      >
        <Plus className="size-6 relative z-10" />
      </button>

      {/* Add Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-gradient-blue text-lg">
              New Goal
            </DialogTitle>
            <DialogDescription>
              What do you want to achieve?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Type selector */}
            <div>
              <Label className="text-xs text-gray-500 mb-3 block">
                Goal Type
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {(Object.entries(GOAL_TYPE_CONFIG) as [GoalType, typeof GOAL_TYPE_CONFIG[GoalType]][]).map(
                  ([type, cfg]) => {
                    const Icon = cfg.icon;
                    const isSelected = selectedType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedType(type)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all min-h-[72px] cursor-pointer ${
                          isSelected
                            ? `${cfg.bg} ${cfg.border} border-2`
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <Icon
                          className={`size-5 ${isSelected ? cfg.color : "text-gray-500"}`}
                        />
                        <span
                          className={`text-[9px] font-medium leading-tight text-center ${
                            isSelected ? cfg.color : "text-gray-500"
                          }`}
                        >
                          {cfg.label}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Target */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Target</Label>
              <Input
                placeholder="e.g. Lose 5kg by summer"
                className="h-12"
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Deadline</Label>
              <Input
                type="date"
                className="h-12"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            {/* Submit */}
            <Button
              className="w-full h-12 btn-electric rounded-xl text-base font-semibold"
              onClick={handleSubmit}
              disabled={submitting || !selectedType || !targetText.trim()}
            >
              {submitting ? "Saving..." : "Create Goal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
