import crypto from "node:crypto";

import { getPrisma } from "@/config/database";
import { env } from "@/config/env";
import { getRazorpay } from "@/config/razorpay";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/shared/errors";
import type { AuthenticatedPrincipal } from "@/shared/types/express";

import { generateInvoiceNumber } from "./invoice-number";
import { planDurationDays } from "./plan-map";

type StudentPrincipal = Extract<AuthenticatedPrincipal, { kind: "STUDENT" }>;

/* ════════════════════════════════════════════════════════════════
   Verify — POST /payments/verify
   ════════════════════════════════════════════════════════════════ */

export interface VerifyPaymentResult {
  success: true;
  orderId: string;
  invoiceId: string;
  enrollmentId: string;
}

function timingSafeHexEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function verifyPayment(params: {
  student: StudentPrincipal;
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<VerifyPaymentResult> {
  const prisma = await getPrisma();
  const {
    student,
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = params;

  // 1. Load order + payment.
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: { where: { gatewayOrderId: razorpayOrderId } },
      enrollment: true,
      invoice: true,
    },
  });

  if (!order) throw new NotFoundError("Order not found", "ORDER_NOT_FOUND");
  if (order.studentId !== student.student.id) {
    throw new ForbiddenError("Order does not belong to you", "ORDER_FORBIDDEN");
  }

  const payment = order.payments[0];
  if (!payment) {
    throw new NotFoundError("Payment record not found", "PAYMENT_NOT_FOUND");
  }

  // 2. Signature — the primary trust boundary.
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (!timingSafeHexEqual(expected, razorpaySignature)) {
    throw new BadRequestError("Invalid payment signature", "SIGNATURE_INVALID");
  }

  // 3. Confirm with Razorpay directly.
  const razorpay = getRazorpay();
  const remote = await razorpay.payments.fetch(razorpayPaymentId);

  if (!remote || remote.order_id !== razorpayOrderId) {
    throw new BadRequestError(
      "Razorpay payment/order mismatch",
      "PAYMENT_MISMATCH",
    );
  }
  if (remote.status !== "captured") {
    throw new BadRequestError(
      `Payment status is ${remote.status}, not captured`,
      "PAYMENT_NOT_CAPTURED",
    );
  }
  const expectedAmount = Math.round(Number(order.totalAmount) * 100);
  if (Number(remote.amount) !== expectedAmount) {
    throw new BadRequestError(
      `Payment amount mismatch: expected ${expectedAmount}, got ${remote.amount}`,
      "AMOUNT_MISMATCH",
    );
  }

  // 4. Idempotency — already processed.
  if (payment.status === "PAID") {
    if (!order.enrollment || !order.invoice) {
      throw new ConflictError(
        "Order marked PAID but enrollment/invoice missing",
        "INCONSISTENT_ORDER",
      );
    }
    return {
      success: true,
      orderId: order.id,
      invoiceId: order.invoice.id,
      enrollmentId: order.enrollment.id,
    };
  }

  // 5. Refuse a second payment against an already-paid order.
  const otherPaid = await prisma.payment.findFirst({
    where: { orderId: order.id, status: "PAID", id: { not: payment.id } },
    select: { id: true },
  });
  if (otherPaid) {
    throw new ConflictError(
      "Order already paid by another payment attempt",
      "ORDER_ALREADY_PAID",
    );
  }

  // 6. Success — single transaction for Payment / Order / Enrollment / Invoice.
  const planType = order.planType ?? "ONE_YEAR";
  const durationDays = order.planDurationDays ?? planDurationDays(planType);
  const expiresAt =
    durationDays === null
      ? null
      : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const now = new Date();
  const invoiceNumber = generateInvoiceNumber(now);

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status: "PAID",
        gatewayPaymentId: razorpayPaymentId,
        paidAt: now,
      },
    });
    if (updatedPayment.count !== 1) {
      throw new ConflictError(
        "Payment already processed by another request",
        "PAYMENT_RACE",
      );
    }

    const updatedOrder = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "PAID" },
    });
    if (updatedOrder.count !== 1) {
      throw new ConflictError(
        "Order already processed by another request",
        "ORDER_RACE",
      );
    }

    const enrollment = await tx.enrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: student.student.id,
          courseId: order.courseId,
        },
      },
      update: {
        status: "ACTIVE",
        accessPlanId: order.accessPlanId,
        planType,
        expiresAt,
      },
      create: {
        studentId: student.student.id,
        courseId: order.courseId,
        status: "ACTIVE",
        accessPlanId: order.accessPlanId,
        planType,
        expiresAt,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { enrollmentId: enrollment.id },
    });

    const existingInvoice = await tx.invoice.findUnique({
      where: { orderId: order.id },
    });
    const invoice =
      existingInvoice ??
      (await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          studentId: student.student.id,
          courseId: order.courseId,
          status: "ISSUED",
          amount: order.amount,
          tax: 0,
          discount: order.discount,
          totalAmount: order.totalAmount,
          currency: "INR",
          issuedAt: now,
          planType,
          planMrp: order.planMrp,
          planPrice: order.planPrice,
          planDurationDays: order.planDurationDays,
          couponCodeSnapshot: order.couponCodeSnapshot,
          couponDiscountAmount: order.couponDiscountAmount,
          // GST out of scope — kept at schema defaults (0/null).
          gstin: null,
          placeOfSupply: null,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          buyerName:
            [student.profile.firstName, student.profile.lastName]
              .filter(Boolean)
              .join(" ") || null,
          buyerAddress: student.profile.address,
        },
      }));

    return { enrollment, invoice };
  });

  return {
    success: true,
    orderId: order.id,
    invoiceId: result.invoice.id,
    enrollmentId: result.enrollment.id,
  };
}

/* ════════════════════════════════════════════════════════════════
   Order detail — GET /orders/:id
   ════════════════════════════════════════════════════════════════ */

export interface OrderDetailResult {
  order: {
    id: string;
    status: string;
    amount: number;
    totalAmount: number;
    currency: string;
    courseId: string;
    planType: string | null;
    planDurationDays: number | null;
    createdAt: string;
    updatedAt: string;
  };
  payments: Array<{
    id: string;
    status: string;
    amount: number;
    gatewayOrderId: string | null;
    gatewayPaymentId: string | null;
    paidAt: string | null;
  }>;
  enrollment: {
    id: string;
    status: string;
    expiresAt: string | null;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
  } | null;
}

export async function getOrderDetail(params: {
  student: StudentPrincipal;
  orderId: string;
}): Promise<OrderDetailResult> {
  const prisma = await getPrisma();
  const { student, orderId } = params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      enrollment: true,
      invoice: true,
    },
  });

  if (!order) throw new NotFoundError("Order not found", "ORDER_NOT_FOUND");
  if (order.studentId !== student.student.id) {
    throw new ForbiddenError("Order does not belong to you", "ORDER_FORBIDDEN");
  }

  return {
    order: {
      id: order.id,
      status: order.status,
      amount: Number(order.amount),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      courseId: order.courseId,
      planType: order.planType,
      planDurationDays: order.planDurationDays,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    },
    payments: order.payments.map((p) => ({
      id: p.id,
      status: p.status,
      amount: Number(p.amount),
      gatewayOrderId: p.gatewayOrderId,
      gatewayPaymentId: p.gatewayPaymentId,
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
    enrollment: order.enrollment
      ? {
          id: order.enrollment.id,
          status: order.enrollment.status,
          expiresAt: order.enrollment.expiresAt?.toISOString() ?? null,
        }
      : null,
    invoice: order.invoice
      ? {
          id: order.invoice.id,
          invoiceNumber: order.invoice.invoiceNumber,
          status: order.invoice.status,
          totalAmount: Number(order.invoice.totalAmount),
        }
      : null,
  };
}