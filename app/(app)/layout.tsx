import { requireAuth } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { clientSubscription, feePlan } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

function isNotExpired(endDate: string): boolean {
  const end = new Date(endDate);
  const now = new Date();
  return end.getTime() >= now.getTime();
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  const subscriptions = await db
    .select({
      planName: feePlan.name,
      endDate: clientSubscription.endDate,
      status: clientSubscription.status,
      createdAt: clientSubscription.createdAt,
    })
    .from(clientSubscription)
    .innerJoin(feePlan, eq(clientSubscription.planId, feePlan.id))
    .where(eq(clientSubscription.clientId, session.user.id))
    .orderBy(desc(clientSubscription.createdAt))
    .limit(20);

  const activeSubscription = subscriptions.find(
    (sub) => sub.status === "active" && isNotExpired(sub.endDate)
  );
  const currentSubscription = activeSubscription ?? subscriptions[0] ?? null;

  return (
    <AppShell
      user={{
        name: session.user.name,
        image: session.user.image,
      }}
      subscription={
        currentSubscription
          ? {
              planName: currentSubscription.planName,
              endDate: currentSubscription.endDate,
              status: currentSubscription.status,
            }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
