import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailEvent } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

// Lazy initialization - don't construct until first use, so missing API key
// doesn't crash module loading during build
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(key);
  }
  return _resend;
}
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  userId?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  userId,
}: SendEmailOptions) {
  try {
    logger.info("Sending email via Resend", { to, subject });

    // Create tracking record first to get ID for tracking pixel
    const [event] = await db
      .insert(emailEvent)
      .values({
        userId,
        toEmail: to,
        subject,
      })
      .returning();

    // Inject tracking pixel
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const trackingPixel = `<img src="${baseUrl}/api/email/track?id=${event.id}" width="1" height="1" style="display:none" alt="" />`;
    const htmlWithPixel = html + trackingPixel;

    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: htmlWithPixel,
    });

    if (result.data?.id) {
      await db
        .update(emailEvent)
        .set({ emailId: result.data.id })
        .where(eq(emailEvent.id, event.id));
    }

    logger.info("Email sent", { to, emailId: result.data?.id });
    return result;
  } catch (err) {
    logger.error("Failed to send email", {
      to,
      subject,
      error: (err as Error).message,
    });
    throw err;
  }
}
