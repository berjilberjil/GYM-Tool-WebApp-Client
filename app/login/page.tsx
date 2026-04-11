"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dumbbell, Mail, Lock, Loader2, MapPin } from "lucide-react";
import { signIn, signOut } from "@/lib/auth/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PublicBranch {
  id: string;
  name: string;
  city: string | null;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error") ?? "";

  const [branches, setBranches] = useState<PublicBranch[] | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchId, setBranchId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>(initialError);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBranches() {
      try {
        const res = await fetch("/api/public/branches", {
          cache: "no-store",
        });
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(data?.error || "Failed to load branches");
          setBranches([]);
          return;
        }

        setBranches(data.branches || []);
        if (!initialError) {
          setError("");
        }
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || "Failed to load branches");
        setBranches([]);
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    }

    loadBranches();

    return () => {
      cancelled = true;
    };
  }, [initialError]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!branchId) {
      setError("Please select your branch first.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      const meRes = await fetch("/api/me");
      if (!meRes.ok) {
        await signOut();
        setError("Failed to verify account. Please try again.");
        setLoading(false);
        return;
      }

      const me = await meRes.json();
      const userBranchId: string | null = me?.profile?.branchId ?? null;
      const userRole: string | null = me?.profile?.role ?? null;

      if (userRole && userRole !== "client") {
        await signOut();
        setError("This app is for gym members only. Staff should use the admin portal.");
        setLoading(false);
        return;
      }

      if (!userBranchId || userBranchId !== branchId) {
        await signOut();
        setError("You are not registered at this branch.");
        setLoading(false);
        return;
      }

      router.push("/");
    } catch (err) {
      setError((err as Error)?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 py-12 bg-gray-50">
      <div className="w-full max-w-100 animate-fade-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 mb-5">
            <Dumbbell className="w-8 h-8 text-electric" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">LuxiFit</h1>
          <p className="text-gray-500 text-sm">Your fitness journey starts here</p>
        </div>

        <div className="space-y-2 mb-5">
          <Label htmlFor="branch" className="text-sm text-gray-700">
            Select your branch
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              id="branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={branchesLoading}
              className="h-11 w-full pl-10 pr-3 bg-white border border-gray-200 text-gray-900 rounded-xl appearance-none text-sm focus:outline-none focus:ring-2 focus:ring-electric/20 disabled:opacity-60"
            >
              <option value="">{branchesLoading ? "Loading branches..." : "Choose a branch"}</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.city ? ` — ${b.city}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {branchId ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-electric w-full h-11 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Sign In"}
            </button>
          </form>
        ) : error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        <p className="text-center text-xs text-gray-400 mt-8">
          New members must be added by a gym coach or manager.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-gray-50">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

