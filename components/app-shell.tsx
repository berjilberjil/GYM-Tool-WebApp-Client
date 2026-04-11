"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  TrendingUp,
  Target,
  CreditCard,
  User,
  Dumbbell,
  MessageCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const tabs = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Progress", icon: TrendingUp, href: "/progress" },
  { label: "Goals", icon: Target, href: "/goals" },
  { label: "Chat", icon: MessageCircle, href: "/chat" },
  { label: "Payments", icon: CreditCard, href: "/payments" },
  { label: "Profile", icon: User, href: "/profile" },
];

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    image?: string | null;
  };
  subscription?: {
    planName: string;
    endDate: string;
    status: "active" | "expired" | "cancelled";
  } | null;
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function AppShell({ children, user, subscription }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 min-h-14 py-2 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-electric" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-bold text-gray-900 tracking-tight block leading-tight">LuxiFit</span>
            {subscription ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold mt-1 ${
                  subscription.status === "active"
                    ? "bg-emerald-50 text-emerald-700"
                    : subscription.status === "expired"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {subscription.planName} • till {formatShortDate(subscription.endDate)}
              </span>
            ) : null}
          </div>
        </div>
        <Avatar className="w-8 h-8 border border-gray-200">
          <AvatarImage src={user.image || undefined} alt={user.name} />
          <AvatarFallback className="bg-blue-50 text-xs text-electric font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* Main content area */}
      <main className="flex-1 w-full max-w-120 mx-auto px-4 pt-4 pb-24">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="max-w-120 mx-auto flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={`flex flex-col items-center justify-center gap-1 w-14 py-1.5 rounded-xl transition-all ${
                  isActive ? "bg-blue-50" : ""
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-electric" : "text-gray-500"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-electric" : "text-gray-500"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Safe area spacer for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
