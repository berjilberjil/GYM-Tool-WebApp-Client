import { requireAuth } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <AppShell
      user={{
        name: session.user.name,
        image: session.user.image,
      }}
    >
      {children}
    </AppShell>
  );
}
