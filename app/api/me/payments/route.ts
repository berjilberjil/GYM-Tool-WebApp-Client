import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  payment,
  clientSubscription,
  feePlan,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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
    const userRole = (session.user as Record<string, unknown>).role;

    if (userRole !== "client") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get payment history
    const payments = await db
      .select({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        dueDate: payment.dueDate,
        paidDate: payment.paidDate,
        method: payment.method,
        notes: payment.notes,
        createdAt: payment.createdAt,
      })
      .from(payment)
      .where(eq(payment.clientId, userId))
      .orderBy(desc(payment.dueDate));

    // Get subscriptions and resolve current one (active + not expired first).
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
    const subscription = activeSubscription ?? subscriptions[0] ?? null;

    // Compute summary stats
    let totalPaid = 0;
    let pendingAmount = 0;
    let overdueCount = 0;

    for (const p of payments) {
      const amt = parseFloat(p.amount);
      if (p.status === "paid") {
        totalPaid += amt;
      } else if (p.status === "pending") {
        pendingAmount += amt;
      } else if (p.status === "overdue") {
        overdueCount += 1;
      }
    }

    return Response.json({
      payments,
      subscription,
      summary: {
        totalPaid,
        pendingAmount,
        overdueCount,
      },
    });
  } catch (error) {
    console.error("GET /api/me/payments error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
