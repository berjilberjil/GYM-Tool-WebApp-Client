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
    };

    if (!body.paymentId) {
      return Response.json({ error: "paymentId is required" }, { status: 400 });
    }

    const [row] = await db
      .select({
        id: payment.id,
        clientId: payment.clientId,
        amount: payment.amount,
        status: payment.status,
      })
      .from(payment)
      .where(
        and(
          eq(payment.id, body.paymentId),
          eq(payment.clientId, session.user.id)
        )
      )
      .limit(1);

    if (!row) {
      return Response.json({ error: "Payment not found" }, { status: 404 });
    }

    if (row.status === "paid") {
      return Response.json({ error: "Payment is already paid" }, { status: 400 });
    }

    if (row.status !== "pending" && row.status !== "overdue") {
      return Response.json({ error: "Only pending/overdue payments can be paid" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!keyId || !keySecret || !publicKey) {
      return Response.json({ error: "Razorpay is not configured" }, { status: 500 });
    }

    const amountPaise = Math.round(Number(row.amount) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      return Response.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `cli_${row.id.slice(0, 18)}_${Date.now()}`,
        notes: {
          paymentId: row.id,
          clientId: row.clientId,
        },
      }),
    });

    const orderData = (await orderRes.json().catch(() => ({}))) as {
      id?: string;
      amount?: number;
      currency?: string;
      error?: { description?: string };
    };

    if (!orderRes.ok || !orderData.id) {
      return Response.json(
        { error: orderData?.error?.description || "Failed to create Razorpay order" },
        { status: 500 }
      );
    }

    return Response.json({
      orderId: orderData.id,
      amount: orderData.amount ?? amountPaise,
      currency: orderData.currency ?? "INR",
      key: publicKey,
      paymentId: row.id,
    });
  } catch (error) {
    console.error("POST /api/me/payments/create-order error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
