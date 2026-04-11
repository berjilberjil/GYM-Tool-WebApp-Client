"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Target,
  CreditCard,
  Calendar,
  Activity,
  ChevronRight,
  Flame,
  Scale,
} from "lucide-react";

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  subscription: {
    status: "active" | "expired" | "none";
    planName?: string;
    endDate?: string;
    daysLeft?: number;
  };
  stats: {
    progressEntries: number;
    activeGoals: number;
  };
  latestProgress: {
    weightKg?: string | null;
    recordedAt?: string;
  } | null;
}

const tips = [
  "Consistency beats intensity. Show up every day.",
  "Hydrate before, during, and after every workout.",
  "Sleep 7-9 hours for optimal muscle recovery.",
  "Progressive overload is the key to growth.",
  "Fuel your body with protein within 30 min post-workout.",
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const firstName = data?.user.name?.split(" ")[0] || "there";
  const tip = tips[Math.floor(Math.random() * tips.length)];

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton greeting */}
        <div className="h-8 w-48 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-5 w-64 rounded-lg bg-gray-100 animate-pulse" />
        {/* Skeleton cards */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load dashboard</p>
      </div>
    );
  }

  const sub = data.subscription;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hey, {firstName}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Subscription card */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 ${
          sub.status === "active"
            ? "bg-gradient-to-br from-[#0057FF] to-[#3B82F6] text-white shadow-lg shadow-blue-500/20"
            : sub.status === "expired"
            ? "bg-gradient-to-br from-[#F97C00] to-[#EF4444] text-white shadow-lg shadow-orange-500/20"
            : "bg-white border border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-medium uppercase tracking-wider ${
            sub.status === "none" ? "text-gray-500" : "text-white/80"
          }`}>
            Subscription
          </span>
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              sub.status === "active"
                ? "bg-white/20 text-white"
                : sub.status === "expired"
                ? "bg-white/20 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {sub.status === "active"
              ? "Active"
              : sub.status === "expired"
              ? "Expired"
              : "None"}
          </span>
        </div>
        {sub.status !== "none" ? (
          <>
            <p className="font-semibold text-base text-white">
              {sub.planName || "Membership"}
            </p>
            {sub.daysLeft != null && sub.daysLeft >= 0 && (
              <p className="text-sm text-white/80 mt-1">
                <span className="font-bold text-lg text-white">
                  {sub.daysLeft}
                </span>{" "}
                days remaining
              </p>
            )}
            {sub.endDate && (
              <p className="text-xs text-white/70 mt-1">
                Expires {new Date(sub.endDate).toLocaleDateString()}
              </p>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            No active subscription. Contact your gym to get started.
          </p>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-3 text-center card-hover">
          <Calendar className="w-4 h-4 text-[#0057FF] mx-auto mb-1.5" />
          <p className="text-[#0057FF] text-xl font-bold">
            {sub.daysLeft != null && sub.daysLeft >= 0 ? sub.daysLeft : "--"}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Days Left</p>
        </div>
        <div className="glass rounded-2xl p-3 text-center card-hover">
          <Activity className="w-4 h-4 text-[#0057FF] mx-auto mb-1.5" />
          <p className="text-gray-900 text-xl font-bold">
            {data.stats.progressEntries}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Progress Logs</p>
        </div>
        <div className="glass rounded-2xl p-3 text-center card-hover">
          <Target className="w-4 h-4 text-[#02CB00] mx-auto mb-1.5" />
          <p className="text-gray-900 text-xl font-bold">
            {data.stats.activeGoals}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Active Goals</p>
        </div>
      </div>

      {/* Latest progress */}
      {data.latestProgress && (
        <div className="glass rounded-2xl p-4 card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Latest Progress
            </span>
            <Scale className="w-4 h-4 text-[#0057FF]" />
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[#0057FF] text-3xl font-bold">
              {data.latestProgress.weightKg
                ? parseFloat(data.latestProgress.weightKg).toFixed(1)
                : "--"}
            </span>
            <span className="text-gray-500 text-sm mb-1">kg</span>
          </div>
          {data.latestProgress.recordedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Recorded{" "}
              {new Date(data.latestProgress.recordedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Quick Actions
        </h2>

        <button
          onClick={() => router.push("/progress")}
          className="w-full glass rounded-2xl p-4 flex items-center gap-3 card-hover text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-[#0057FF]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Log Progress</p>
            <p className="text-xs text-gray-500">Track your weight & measurements</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </button>

        <button
          onClick={() => router.push("/goals")}
          className="w-full glass rounded-2xl p-4 flex items-center gap-3 card-hover text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-[#02CB00]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">View Goals</p>
            <p className="text-xs text-gray-500">Check your fitness targets</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </button>

        <button
          onClick={() => router.push("/payments")}
          className="w-full glass rounded-2xl p-4 flex items-center gap-3 card-hover text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-[#F97C00]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Payment History</p>
            <p className="text-xs text-gray-500">View your billing & receipts</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
      </div>

      {/* Motivational tip */}
      <div className="glass rounded-2xl p-4 border-l-4 border-[#F97C00]">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-[#F97C00]" />
          <span className="text-xs font-semibold text-[#F97C00] uppercase tracking-wider">
            Daily Tip
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed italic">
          &ldquo;{tip}&rdquo;
        </p>
      </div>
    </div>
  );
}
