import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPresence } from "@/lib/db/schema";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = (await req.json().catch(() => ({}))) as {
      status?: string;
    };
    const status =
      body.status === "away" || body.status === "offline"
        ? body.status
        : "online";

    const now = new Date();

    await db
      .insert(userPresence)
      .values({ userId, status, lastSeenAt: now })
      .onConflictDoUpdate({
        target: userPresence.userId,
        set: { status, lastSeenAt: now },
      });

    logger.debug("Presence updated", { userId, status });
    return Response.json({ ok: true, status, lastSeenAt: now });
  } catch (err) {
    logger.error("Failed to update presence", {
      error: (err as Error).message,
    });
    return Response.json(
      { error: "Failed to update presence" },
      { status: 500 }
    );
  }
}
