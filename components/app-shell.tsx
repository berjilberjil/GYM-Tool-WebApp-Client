"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, TrendingUp, Target, CreditCard, User, Dumbbell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const tabs = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Progress", icon: TrendingUp, href: "/progress" },
  { label: "Goals", icon: Target, href: "/goals" },
  { label: "Payments", icon: CreditCard, href: "/payments" },
  { label: "Profile", icon: User, href: "/profile" },
];

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    image?: string | null;
  };
}

export function AppShell({ children, user }: AppShellProps) {
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
    <div className="min-h-dvh bg-[#0A0A0F] flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-40 glass px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0057FF]/10 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-[#0057FF]" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">PartApp</span>
        </div>
        <Avatar className="w-8 h-8 border border-white/[0.06]">
          <AvatarImage src={user.image || undefined} alt={user.name} />
          <AvatarFallback className="bg-[#1A1A2E] text-xs text-white font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* Main content area */}
      <main className="flex-1 w-full max-w-[480px] mx-auto px-4 pt-4 pb-24">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/[0.06]">
        <div className="max-w-[480px] mx-auto flex items-center justify-around h-16 px-2">
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
                className="flex flex-col items-center justify-center gap-1 w-14 py-1 transition-all"
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? "text-[#0057FF]" : "text-[#6B6B80]"
                    }`}
                  />
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0057FF]" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-[#0057FF]" : "text-[#6B6B80]"
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
