import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { branch, chatParticipant, chatRoom, user } from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

type DirectTargetKind = "coach" | "manager";

async function resolveTargetUserId(
  me: {
    id: string;
    role: string;
    coachId: string | null;
    branchId: string | null;
  },
  kind: DirectTargetKind
): Promise<string | null> {
  if (kind === "coach") {
    return me.coachId;
  }

  if (!me.branchId) return null;

  const [b] = await db
    .select({ managerId: branch.managerId })
    .from(branch)
    .where(eq(branch.id, me.branchId))
    .limit(1);

  return b?.managerId ?? null;
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meId = session.user.id;
    const body = (await req.json().catch(() => ({}))) as { kind?: string };
    const kind: DirectTargetKind =
      body.kind === "manager" ? "manager" : "coach";

    const [me] = await db
      .select({
        id: user.id,
        role: user.role,
        orgId: user.orgId,
        branchId: user.branchId,
        coachId: user.coachId,
      })
      .from(user)
      .where(eq(user.id, meId))
      .limit(1);

    if (!me) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (me.role !== "client") {
      return Response.json(
        { error: "Only clients can use this endpoint" },
        { status: 403 }
      );
    }

    const targetUserId = await resolveTargetUserId(me, kind);
    if (!targetUserId) {
      return Response.json(
        { error: `No assigned ${kind} found` },
        { status: 400 }
      );
    }

    const [target] = await db
      .select({ id: user.id, role: user.role, isActive: user.isActive })
      .from(user)
      .where(eq(user.id, targetUserId))
      .limit(1);

    if (!target || !target.isActive) {
      return Response.json(
        { error: `${kind} account is inactive` },
        { status: 400 }
      );
    }

    if (target.role === "client") {
      return Response.json(
        { error: `Assigned ${kind} is invalid` },
        { status: 400 }
      );
    }

    const candidateRooms = await db
      .select({ roomId: chatParticipant.roomId, c: sql<number>`count(*)::int` })
      .from(chatParticipant)
      .innerJoin(chatRoom, eq(chatParticipant.roomId, chatRoom.id))
      .where(
        and(
          eq(chatRoom.type, "direct"),
          inArray(chatParticipant.userId, [meId, targetUserId])
        )
      )
      .groupBy(chatParticipant.roomId)
      .having(sql`count(distinct ${chatParticipant.userId}) = 2`)
      .limit(1);

    const existingRoomId = candidateRooms[0]?.roomId;
    if (existingRoomId) {
      return Response.json({ roomId: existingRoomId, created: false });
    }

    let orgId = me.orgId;
    if (!orgId && me.branchId) {
      const [b] = await db
        .select({ orgId: branch.orgId })
        .from(branch)
        .where(eq(branch.id, me.branchId))
        .limit(1);
      orgId = b?.orgId ?? null;
    }

    if (!orgId) {
      return Response.json(
        { error: "Client organization not found" },
        { status: 400 }
      );
    }

    const [room] = await db
      .insert(chatRoom)
      .values({
        orgId,
        branchId: me.branchId,
        type: "direct",
        createdBy: meId,
      })
      .returning({ id: chatRoom.id });

    await db.insert(chatParticipant).values([
      { roomId: room.id, userId: meId },
      { roomId: room.id, userId: targetUserId },
    ]);

    logger.info("Direct chat room created", {
      requesterId: meId,
      targetUserId,
      kind,
      roomId: room.id,
    });

    return Response.json({ roomId: room.id, created: true });
  } catch (err) {
    logger.error("Failed to create/find direct chat", {
      error: (err as Error).message,
    });
    return Response.json(
      { error: "Failed to start direct chat" },
      { status: 500 }
    );
  }
}
