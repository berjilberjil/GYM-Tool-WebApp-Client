import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { goal } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

type GoalType = "fat_loss" | "muscle_gain" | "strength" | "endurance" | "general";

const allowedGoalTypes: GoalType[] = [
  "fat_loss",
  "muscle_gain",
  "strength",
  "endurance",
  "general",
];

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goals = await db
      .select()
      .from(goal)
      .where(eq(goal.clientId, session.user.id))
      .orderBy(desc(goal.createdAt));

    return Response.json({ goals });
  } catch {
    return Response.json({ error: "Failed to load goals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      type?: GoalType;
      target?: string;
      deadline?: string;
    };

    const type = body.type;
    const target = body.target?.trim() ?? "";
    const deadline = body.deadline?.trim() || null;

    if (!type || !allowedGoalTypes.includes(type)) {
      return Response.json({ error: "Invalid goal type" }, { status: 400 });
    }

    if (!target) {
      return Response.json({ error: "Target is required" }, { status: 400 });
    }

    if (target.length > 500) {
      return Response.json(
        { error: "Target is too long (max 500 chars)" },
        { status: 400 }
      );
    }

    if (deadline && Number.isNaN(new Date(deadline).getTime())) {
      return Response.json({ error: "Invalid deadline date" }, { status: 400 });
    }

    const [createdGoal] = await db
      .insert(goal)
      .values({
        clientId: session.user.id,
        type,
        target,
        deadline,
      })
      .returning();

    return Response.json({ goal: createdGoal }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      action?: "archive" | "activate";
    };

    const id = body.id;
    const action = body.action;

    if (!id || !action) {
      return Response.json({ error: "id and action are required" }, { status: 400 });
    }

    const nextStatus = action === "archive" ? "abandoned" : "active";

    const [updated] = await db
      .update(goal)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(and(eq(goal.id, id), eq(goal.clientId, session.user.id)))
      .returning({ id: goal.id, clientId: goal.clientId, status: goal.status });

    if (!updated) {
      return Response.json({ error: "Goal not found" }, { status: 404 });
    }

    return Response.json({ goal: updated });
  } catch {
    return Response.json({ error: "Failed to update goal" }, { status: 500 });
  }
}
