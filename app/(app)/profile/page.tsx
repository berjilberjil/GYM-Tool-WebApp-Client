"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/lib/auth/client";
import {
  LogOut,
  Phone,
  MapPin,
  Dumbbell,
  Calendar,
  CreditCard,
  Shield,
  Loader2,
  AlertOctagon,
  User,
} from "lucide-react";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  image: string | null;
  createdAt: string;
}

interface Subscription {
  id: string;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled";
  planName: string;
  planAmount: string;
  planDurationDays: number;
}

interface MeData {
  profile: Profile;
  branchName: string | null;
  coachName: string | null;
  rawSubscription: Subscription | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function InfoCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <div
      className="glass rounded-2xl p-4 flex items-center gap-3 card-hover animate-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) throw new Error("Failed to load profile");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          },
        },
      });
    } catch {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#0057FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <AlertOctagon className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { profile, branchName, coachName, rawSubscription: subscription } = data;

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Avatar Section */}
      <div className="flex flex-col items-center text-center animate-fade-up">
        <div className="relative mb-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-500/20"
            style={{
              background: "linear-gradient(135deg, #0057FF 0%, #3B82F6 100%)",
            }}
          >
            {profile.image ? (
              <img
                src={profile.image}
                alt={profile.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(profile.name)
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-[#0057FF] flex items-center justify-center shadow-sm">
            <User className="w-3.5 h-3.5 text-[#0057FF]" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>
        <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0057FF] text-xs font-semibold border border-blue-100">
          <Shield className="w-3 h-3" />
          {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
        </span>
      </div>

      {/* Info Cards */}
      <div className="space-y-2.5">
        {profile.phone && (
          <InfoCard
            icon={<Phone className="w-4 h-4 text-[#0057FF]" />}
            label="Phone"
            value={profile.phone}
            delay={0.05}
          />
        )}
        {branchName && (
          <InfoCard
            icon={<MapPin className="w-4 h-4 text-[#0057FF]" />}
            label="Branch"
            value={branchName}
            delay={0.1}
          />
        )}
        {coachName && (
          <InfoCard
            icon={<Dumbbell className="w-4 h-4 text-[#0057FF]" />}
            label="Coach"
            value={coachName}
            delay={0.15}
          />
        )}
        <InfoCard
          icon={<Calendar className="w-4 h-4 text-[#0057FF]" />}
          label="Member Since"
          value={formatDate(profile.createdAt)}
          delay={0.2}
        />
      </div>

      {/* Subscription Card */}
      <div className="animate-fade-up delay-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          Subscription
        </h2>
        {subscription ? (
          <div
            className={`glass rounded-2xl p-4 border-l-4 ${
              subscription.status === "active"
                ? "border-l-emerald-500"
                : subscription.status === "expired"
                ? "border-l-red-500"
                : "border-l-amber-500"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">
                {subscription.planName}
              </p>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  subscription.status === "active"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : subscription.status === "expired"
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-amber-50 text-amber-600 border-amber-200"
                }`}
              >
                {subscription.status.charAt(0).toUpperCase() +
                  subscription.status.slice(1)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {formatDate(subscription.startDate)} -{" "}
              {formatDate(subscription.endDate)}
            </p>
            <p className="text-lg font-bold text-[#0057FF] mt-2">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                minimumFractionDigits: 0,
              }).format(parseFloat(subscription.planAmount))}
            </p>
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 text-center">
            <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active subscription</p>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="animate-fade-up delay-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Settings</h2>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {signingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          {signingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>

      {/* App Info */}
      <div className="text-center animate-fade-up delay-6 pt-2">
        <p className="text-xs text-gray-400">LuxiFit v1.0</p>
      </div>
    </div>
  );
}
