import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  chatRoom,
  chatParticipant,
  chatMessage,
  user,
} from "@/lib/db/schema";
import { and, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

function getPgErrorCode(err: unknown): string | undefined {
  const value = err as { cause?: { code?: string } };
  return value.cause?.code;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rooms the user is a participant in
    const myParticipations = await db
      .select({
        roomId: chatParticipant.roomId,
        lastReadAt: chatParticipant.lastReadAt,
      })
      .from(chatParticipant)
      .where(eq(chatParticipant.userId, userId));

    const roomIds = myParticipations.map((p) => p.roomId);
    if (roomIds.length === 0) {
      logger.info("Chat rooms listed", { userId, count: 0 });
      return Response.json({ rooms: [] });
    }

    const rooms = await db
      .select({
        id: chatRoom.id,
        name: chatRoom.name,
        type: chatRoom.type,
        lastMessageAt: chatRoom.lastMessageAt,
        createdAt: chatRoom.createdAt,
      })
      .from(chatRoom)
      .where(inArray(chatRoom.id, roomIds))
      .orderBy(desc(chatRoom.lastMessageAt));

    const result = await Promise.all(
      rooms.map(async (r) => {
        const mine = myParticipations.find((p) => p.roomId === r.id);
        const lastReadAt = mine?.lastReadAt ?? null;

        const participants = await db
          .select({
            userId: chatParticipant.userId,
            name: user.name,
            image: user.image,
          })
          .from(chatParticipant)
          .innerJoin(user, eq(chatParticipant.userId, user.id))
          .where(eq(chatParticipant.roomId, r.id));

        const [lastMsg] = await db
          .select({
            content: chatMessage.content,
            senderId: chatMessage.senderId,
            createdAt: chatMessage.createdAt,
          })
          .from(chatMessage)
          .where(eq(chatMessage.roomId, r.id))
          .orderBy(desc(chatMessage.createdAt))
          .limit(1);

        const unreadRows = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(chatMessage)
          .where(
            and(
              eq(chatMessage.roomId, r.id),
              ne(chatMessage.senderId, userId),
              lastReadAt
                ? gt(chatMessage.createdAt, lastReadAt)
                : sql`true`
            )
          );
        const unreadCount = unreadRows[0]?.c ?? 0;

        return {
          id: r.id,
          name: r.name,
          type: r.type,
          lastMessageAt: r.lastMessageAt,
          createdAt: r.createdAt,
          participants: participants.filter((p) => p.userId !== userId),
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                senderId: lastMsg.senderId,
                createdAt: lastMsg.createdAt,
                isMine: lastMsg.senderId === userId,
              }
            : null,
          unreadCount,
        };
      })
    );

    logger.info("Chat rooms listed", { userId, count: result.length });
    return Response.json({ rooms: result });
  } catch (err) {
    const pgCode = getPgErrorCode(err);
    if (pgCode === "42P01" || pgCode === "42703") {
      logger.warn("Chat feature unavailable until DB schema is synced", {
        pgCode,
      });
      return Response.json({ rooms: [], degraded: true });
    }

    logger.error("Failed to list chat rooms", {
      error: (err as Error).message,
      pgCode,
    });
    return Response.json({ error: "Failed to load rooms" }, { status: 500 });
  }
}
