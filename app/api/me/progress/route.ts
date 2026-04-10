import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { progressEntry } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await db
    .select()
    .from(progressEntry)
    .where(eq(progressEntry.clientId, session.user.id))
    .orderBy(desc(progressEntry.recordedAt));

  return Response.json({ entries });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const [entry] = await db
      .insert(progressEntry)
      .values({
        clientId: session.user.id,
        weightKg: body.weightKg ?? null,
        bodyFatPct: body.bodyFatPct ?? null,
        chest: body.chest ?? null,
        waist: body.waist ?? null,
        hips: body.hips ?? null,
        arms: body.arms ?? null,
        thighs: body.thighs ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    return Response.json({ entry }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
