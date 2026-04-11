"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  TrendingUp,
  AlertOctagon,
  Receipt,
  Loader2,
} from "lucide-react";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  theme?: { color?: string };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface Payment {
  id: string;
  amount: string;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
  paidDate: string | null;
  method: "cash" | "upi" | "card" | "bank_transfer" | null;
  notes: string | null;
  createdAt: string;
}

interface Subscription {
  id: string;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled";
  planName: string;
  planAmount: string;
  planDurationDays: number;
}

interface Summary {
  totalPaid: number;
  pendingAmount: number;
  overdueCount: number;
}

interface PaymentsData {
  payments: Payment[];
  subscription: Subscription | null;
  summary: Summary;
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-4 h-4" />,
  upi: <Smartphone className="w-4 h-4" />,
  card: <CreditCard className="w-4 h-4" />,
  bank_transfer: <Building2 className="w-4 h-4" />,
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank Transfer",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function StatusBadge({ status }: { status: "paid" | "pending" | "overdue" }) {
  const config = {
    paid: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: "Paid",
    },
    pending: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      icon: <Clock className="w-3.5 h-3.5" />,
      label: "Pending",
    },
    overdue: {
      bg: "bg-red-50",
      text: "text-red-600",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: "Overdue",
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

function SubscriptionCard({
  subscription,
}: {
  subscription: Subscription | null;
}) {
  if (!subscription) {
    return (
      <div className="glass rounded-2xl p-5 animate-fade-up">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Subscription</p>
            <p className="text-base font-semibold text-gray-500">
              No active plan
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isActive = subscription.status === "active";
  const isExpired = subscription.status === "expired";

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 animate-fade-up text-white shadow-lg shadow-blue-500/20"
      style={{
        background: isActive
          ? "linear-gradient(135deg, #0057FF 0%, #3B82F6 100%)"
          : isExpired
          ? "linear-gradient(135deg, #EF4444 0%, #F97C00 100%)"
          : "linear-gradient(135deg, #64748B 0%, #475569 100%)",
      }}
    >
      <div className="absolute inset-0 animate-shimmer pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/80 uppercase tracking-wider">
                Current Plan
              </p>
              <p className="text-lg font-bold text-white">
                {subscription.planName}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
            {subscription.status.charAt(0).toUpperCase() +
              subscription.status.slice(1)}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-xs text-white/80">
              {formatDate(subscription.startDate)} -{" "}
              {formatDate(subscription.endDate)}
            </p>
            <p className="text-xs text-white/80">
              {subscription.planDurationDays} day plan
            </p>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(subscription.planAmount)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function loadRazorpayScript() {
    if (typeof window === "undefined") return false;
    if (window.Razorpay) return true;
    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  useEffect(() => {
    async function fetchPayments() {
      try {
        const res = await fetch("/api/me/payments", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to fetch payments");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  async function refreshPayments() {
    const res = await fetch("/api/me/payments", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch payments");
    const json = await res.json();
    setData(json);
  }

  async function handlePayNow(p: Payment) {
    setPayingId(p.id);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        alert("Unable to load payment gateway. Please try again.");
        return;
      }

      const orderRes = await fetch("/api/me/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: p.id }),
      });

      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        alert(orderData?.error || "Failed to initiate payment");
        return;
      }

      const rzp = new window.Razorpay({
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "LuxiFit",
        description: `Payment for due ${formatDate(p.dueDate)}`,
        order_id: orderData.orderId,
        theme: { color: "#0057FF" },
        handler: async (response: RazorpayResponse) => {
          const verifyRes = await fetch("/api/me/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentId: p.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json().catch(() => ({}));
          if (!verifyRes.ok) {
            alert(verifyData?.error || "Payment verification failed");
            return;
          }

          await refreshPayments();
        },
      });

      rzp.open();
    } catch {
      alert("Payment failed to start. Please try again.");
    } finally {
      setPayingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <AlertOctagon className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { payments, subscription, summary } = data;

  return (
    <div className="w-full max-w-120 mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your subscription and payment history
        </p>
      </div>

      {/* Subscription Card */}
      <SubscriptionCard subscription={subscription} />

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 animate-fade-up delay-2">
        <div className="glass rounded-2xl p-4 text-center">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-base font-bold text-gray-900">
            {formatCurrency(summary.totalPaid)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Total Paid</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-base font-bold text-gray-900">
            {formatCurrency(summary.pendingAmount)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Pending</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-base font-bold text-gray-900">
            {summary.overdueCount}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Overdue</p>
        </div>
      </div>

      {/* Payment History */}
      <div className="animate-fade-up delay-3">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-gray-400" />
          Payment History
        </h2>

        {payments.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">
              No payments yet
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Your payment history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {payments.map((p, i) => (
              <div
                key={p.id}
                className="glass rounded-2xl p-4 card-hover animate-fade-up"
                style={{ animationDelay: `${0.05 * (i + 1)}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        p.status === "paid"
                          ? "bg-emerald-50 text-emerald-600"
                          : p.status === "pending"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {p.method ? (
                        METHOD_ICONS[p.method]
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.method
                          ? METHOD_LABELS[p.method]
                          : "Payment"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.paidDate
                          ? formatDate(p.paidDate)
                          : `Due ${formatDate(p.dueDate)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <p className="text-base font-bold text-gray-900">
                      {formatCurrency(p.amount)}
                    </p>
                    <StatusBadge status={p.status} />
                    {(p.status === "pending" || p.status === "overdue") && (
                      <button
                        type="button"
                        onClick={() => handlePayNow(p)}
                        disabled={payingId === p.id}
                        className="mt-1 inline-flex items-center justify-center rounded-full bg-electric px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        {payingId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Pay Now"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
