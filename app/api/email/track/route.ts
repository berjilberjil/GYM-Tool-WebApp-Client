import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailEvent } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    try {
      await db
        .update(emailEvent)
        .set({ openedAt: new Date() })
        .where(eq(emailEvent.id, id));
      logger.info("Email opened", { emailEventId: id });
    } catch (err) {
      logger.error("Email tracking failed", {
        emailEventId: id,
        error: (err as Error).message,
      });
    }
  }
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
