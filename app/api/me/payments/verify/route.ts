import crypto from "node:crypto";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payment } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "client") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      paymentId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    const { paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!paymentId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return Response.json({ error: "Razorpay is not configured" }, { status: 500 });
    }

    const [row] = await db
      .select({ id: payment.id, clientId: payment.clientId, status: payment.status })
      .from(payment)
      .where(and(eq(payment.id, paymentId), eq(payment.clientId, session.user.id)))
      .limit(1);

    if (!row) {
      return Response.json({ error: "Payment not found" }, { status: 404 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return Response.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    await db
      .update(payment)
      .set({
        status: "paid",
        paidDate: today,
        method: "card",
        notes: `Razorpay payment ${razorpay_payment_id}`,
      })
      .where(eq(payment.id, row.id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("POST /api/me/payments/verify error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
