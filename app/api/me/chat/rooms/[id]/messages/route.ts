import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  chatRoom,
  chatParticipant,
  chatMessage,
  user,
} from "@/lib/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

async function assertParticipant(userId: string, roomId: string) {
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
  return !!p;
}

export async function GET(
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

    const isParticipant = await assertParticipant(userId, roomId);
    if (!isParticipant) {
      logger.warn("Chat messages GET denied: not a participant", {
        userId,
        roomId,
      });
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await db
      .select({
        id: chatMessage.id,
        roomId: chatMessage.roomId,
        senderId: chatMessage.senderId,
        senderName: user.name,
        senderRole: user.role,
        senderImage: user.image,
        content: chatMessage.content,
        createdAt: chatMessage.createdAt,
      })
      .from(chatMessage)
      .innerJoin(user, eq(chatMessage.senderId, user.id))
      .where(eq(chatMessage.roomId, roomId))
      .orderBy(asc(chatMessage.createdAt));

    // Mark this room read using DB message timestamp to avoid app/server clock drift.
    const [latestMessage] = await db
      .select({ createdAt: chatMessage.createdAt })
      .from(chatMessage)
      .where(eq(chatMessage.roomId, roomId))
      .orderBy(desc(chatMessage.createdAt))
      .limit(1);

    if (latestMessage?.createdAt) {
      await db
        .update(chatParticipant)
        .set({ lastReadAt: latestMessage.createdAt })
        .where(
          and(
            eq(chatParticipant.userId, userId),
            eq(chatParticipant.roomId, roomId)
          )
        );
    }

    // Get participants' lastReadAt to compute read receipts
    const participants = await db
      .select({
        userId: chatParticipant.userId,
        name: user.name,
        role: user.role,
        lastReadAt: chatParticipant.lastReadAt,
      })
      .from(chatParticipant)
      .innerJoin(user, eq(chatParticipant.userId, user.id))
      .where(eq(chatParticipant.roomId, roomId));

    logger.info("Chat messages fetched", {
      userId,
      roomId,
      count: messages.length,
    });

    return Response.json({ messages, participants });
  } catch (err) {
    logger.error("Failed to fetch chat messages", {
      error: (err as Error).message,
    });
    return Response.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await ctx.params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const isParticipant = await assertParticipant(userId, roomId);
    if (!isParticipant) {
      logger.warn("Chat message POST denied: not a participant", {
        userId,
        roomId,
      });
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      content?: string;
    };
    const content = (body.content ?? "").trim();
    if (!content) {
      return Response.json(
        { error: "Message content required" },
        { status: 400 }
      );
    }
    if (content.length > 4000) {
      return Response.json(
        { error: "Message too long (max 4000 chars)" },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(chatMessage)
      .values({
        roomId,
        senderId: userId,
        content,
      })
      .returning();

    // Update room lastMessageAt
    await db
      .update(chatRoom)
      .set({ lastMessageAt: inserted.createdAt })
      .where(eq(chatRoom.id, roomId));

    // Mark sender's own room as read
    await db
      .update(chatParticipant)
      .set({ lastReadAt: inserted.createdAt })
      .where(
        and(
          eq(chatParticipant.userId, userId),
          eq(chatParticipant.roomId, roomId)
        )
      );

    logger.info("Chat message sent", {
      userId,
      roomId,
      messageId: inserted.id,
    });

    return Response.json({ message: inserted });
  } catch (err) {
    logger.error("Failed to send chat message", {
      error: (err as Error).message,
    });
    return Response.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
