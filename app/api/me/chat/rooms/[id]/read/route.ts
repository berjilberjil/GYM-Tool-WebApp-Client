import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatParticipant } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await ctx.params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const [p] = await db
      .select({ id: chatParticipant.id })
      .from(chatParticipant)
      .where(
        and(
          eq(chatParticipant.userId, userId),
          eq(chatParticipant.roomId, roomId)
        )
      )
      .limit(1);

    if (!p) {
      logger.warn("Chat mark read denied: not a participant", {
        userId,
        roomId,
      });
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .update(chatParticipant)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(chatParticipant.userId, userId),
          eq(chatParticipant.roomId, roomId)
        )
      );

    logger.info("Chat room marked read", { userId, roomId });
    return Response.json({ ok: true });
  } catch (err) {
    logger.error("Failed to mark chat as read", {
      error: (err as Error).message,
    });
    return Response.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
