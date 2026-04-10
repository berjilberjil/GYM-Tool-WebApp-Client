import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { goal } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
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
}
