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

function isNotExpired(endDate: string): boolean {
  const end = new Date(endDate);
  const now = new Date();
  return end.getTime() >= now.getTime();
}

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
    let managerId: string | null = null;
    let managerName: string | null = null;
    if (profile.coachId) {
      const [coachRow] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, profile.coachId))
        .limit(1);
      coachName = coachRow?.name ?? null;
    }

    if (profile.branchId) {
      const [managerRow] = await db
        .select({ managerId: branch.managerId })
        .from(branch)
        .where(eq(branch.id, profile.branchId))
        .limit(1);
      managerId = managerRow?.managerId ?? null;

      if (managerId) {
        const [managerUser] = await db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, managerId))
          .limit(1);
        managerName = managerUser?.name ?? null;
      }
    }

    // Get subscriptions and resolve the current one (active + not expired first).
    const subscriptions = await db
      .select({
        id: clientSubscription.id,
        startDate: clientSubscription.startDate,
        endDate: clientSubscription.endDate,
        status: clientSubscription.status,
        planName: feePlan.name,
        planAmount: feePlan.amount,
        planDurationDays: feePlan.durationDays,
        createdAt: clientSubscription.createdAt,
      })
      .from(clientSubscription)
      .innerJoin(feePlan, eq(clientSubscription.planId, feePlan.id))
      .where(eq(clientSubscription.clientId, userId))
      .orderBy(desc(clientSubscription.createdAt))
      .limit(20);

    const activeSubscription = subscriptions.find(
      (sub) => sub.status === "active" && isNotExpired(sub.endDate)
    );
    const currentSubscription = activeSubscription ?? subscriptions[0] ?? null;

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

    const latestGoalArr = await db
      .select({
        id: goal.id,
        target: goal.target,
        deadline: goal.deadline,
        status: goal.status,
        createdAt: goal.createdAt,
      })
      .from(goal)
      .where(and(eq(goal.clientId, userId), eq(goal.status, "active")))
      .orderBy(desc(goal.createdAt))
      .limit(1);

    const latestGoal = latestGoalArr[0] ?? null;
    const latestGoalWithDays = latestGoal
      ? {
          ...latestGoal,
          daysLeft: latestGoal.deadline
            ? Math.ceil(
                (new Date(latestGoal.deadline).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
              )
            : null,
        }
      : null;

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
      latestGoal: latestGoalWithDays,
      // Profile fields
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        image: profile.image,
        branchId: profile.branchId,
        orgId: profile.orgId,
        coachId: profile.coachId,
        isActive: profile.isActive,
        createdAt: profile.createdAt,
      },
      branchName,
      coachName,
      managerId,
      managerName,
      rawSubscription: currentSubscription,
    });
  } catch (error) {
    console.error("GET /api/me error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
