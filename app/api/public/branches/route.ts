import { db } from "@/lib/db";
import { branch } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: branch.id,
        name: branch.name,
        city: branch.location,
      })
      .from(branch)
      .where(eq(branch.isActive, true));

    logger.info("Public branches fetched", { count: rows.length });

    return Response.json({ branches: rows });
  } catch (err) {
    logger.error("Failed to fetch public branches", {
      error: (err as Error).message,
    });
    return Response.json(
      { error: "Failed to load branches" },
      { status: 500 }
    );
  }
}
