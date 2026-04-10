import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  user,
  branch,
  clientSubscription,
  feePlan,
  progressEntry,
  goal,
} from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get full user profile
    const [profile] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!profile) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Get branch name
    let branchName: string | null = null;
    if (profile.branchId) {
      const [branchRow] = await db
        .select({ name: branch.name })
        .from(branch)
        .where(eq(branch.id, profile.branchId))
        .limit(1);
      branchName = branchRow?.name ?? null;
    }

    // Get coach name
    let coachName: string | null = null;
    if (profile.coachId) {
      const [coachRow] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, profile.coachId))
        .limit(1);
      coachName = coachRow?.name ?? null;
    }

    // Get current subscription with plan details
    const subscriptions = await db
      .select({
        id: clientSubscription.id,
        startDate: clientSubscription.startDate,
        endDate: clientSubscription.endDate,
        status: clientSubscription.status,
        planName: feePlan.name,
        planAmount: feePlan.amount,
        planDurationDays: feePlan.durationDays,
      })
      .from(clientSubscription)
      .innerJoin(feePlan, eq(clientSubscription.planId, feePlan.id))
      .where(eq(clientSubscription.clientId, userId))
      .orderBy(desc(clientSubscription.createdAt))
      .limit(1);

    const currentSubscription = subscriptions[0] ?? null;

    // Compute subscription status for dashboard
    let subscriptionData: {
      status: "active" | "expired" | "none";
      planName?: string;
      endDate?: string;
      daysLeft?: number;
    };

    if (currentSubscription) {
      const now = new Date();
      const endDate = new Date(currentSubscription.endDate);
      const daysLeft = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isActive =
        currentSubscription.status === "active" && daysLeft >= 0;

      subscriptionData = {
        status: isActive ? "active" : "expired",
        planName: currentSubscription.planName || undefined,
        endDate: currentSubscription.endDate,
        daysLeft: Math.max(0, daysLeft),
      };
    } else {
      subscriptionData = { status: "none" };
    }

    // Get progress entries count
    const progressCount = await db
      .select({ value: count() })
      .from(progressEntry)
      .where(eq(progressEntry.clientId, userId));

    // Get active goals count
    const goalsCount = await db
      .select({ value: count() })
      .from(goal)
      .where(and(eq(goal.clientId, userId), eq(goal.status, "active")));

    // Get latest progress entry
    const latestProgressArr = await db
      .select({
        weightKg: progressEntry.weightKg,
        recordedAt: progressEntry.recordedAt,
      })
      .from(progressEntry)
      .where(eq(progressEntry.clientId, userId))
      .orderBy(desc(progressEntry.recordedAt))
      .limit(1);

    return Response.json({
      // Dashboard fields
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.image,
      },
      subscription: subscriptionData,
      stats: {
        progressEntries: progressCount[0]?.value ?? 0,
        activeGoals: goalsCount[0]?.value ?? 0,
      },
      latestProgress: latestProgressArr[0] || null,
      // Profile fields
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        image: profile.image,
        createdAt: profile.createdAt,
      },
      branchName,
      coachName,
      rawSubscription: currentSubscription,
    });
  } catch (error) {
    console.error("GET /api/me error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
