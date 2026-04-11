import { db } from "@/lib/db";
import { branch } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("[API] /api/public/branches - Fetching active branches...");
    
    const rows = await db
      .select({
        id: branch.id,
        name: branch.name,
        city: branch.location,
        memberCount: sql<number>`(
          select count(*)::int
          from "user"
          where "user"."branch_id" = ${branch.id}::text
            and "user"."role" = 'client'
            and "user"."is_active" = true
        )`,
      })
      .from(branch)
      .where(eq(branch.isActive, true));

    console.log(`[API] /api/public/branches - Found ${rows.length} active branches`);
    logger.info("Public branches fetched", {
      count: rows.length,
      totalMembers: rows.reduce((sum, row) => sum + (row.memberCount ?? 0), 0),
    });

    return Response.json(
      { branches: rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error("[API] /api/public/branches - Error:", errorMsg, err);
    logger.error("Failed to fetch public branches", {
      error: errorMsg,
    });
    return Response.json(
      { error: "Failed to load branches" },
      { status: 500 }
    );
  }
}
