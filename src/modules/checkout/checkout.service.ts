import { getPrisma } from "@/config/database";
import { env } from "@/config/env";
import { getRazorpay } from "@/config/razorpay";
import type { AccessPlanType } from "@/generated/prisma/client";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/shared/errors";
import type { AuthenticatedPrincipal } from "@/shared/types/express";

import {
  PLAN_ENUM_TO_URL,
  PLAN_URL_TO_ENUM,
  planDurationDays,
  planLabel,
} from "./plan-map";

type StudentPrincipal = Extract<AuthenticatedPrincipal, { kind: "STUDENT" }>;

/* ════════════════════════════════════════════════════════════════
   Quote — GET /checkout/:courseId?plan=
   ════════════════════════════════════════════════════════════════ */

export interface QuoteResult {
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
  };
  plan: {
    id: string;                    // "year" | "threeyear" | "life"
    type: AccessPlanType;
    label: string;                 // "1 Year" / "3 Years" / "Lifetime"
    price: number;                 // ₹, not paise
    mrp: number;
    durationDays: number | null;
  };
  alreadyEnrolled: boolean;
}

export async function getCheckoutQuote(params: {
  studentId: string;
  courseId: string;
  planUrlId: string;
}): Promise<QuoteResult> {
  const prisma = await getPrisma();
  const { studentId, courseId, planUrlId } = params;

  const type = PLAN_URL_TO_ENUM[planUrlId];
  if (!type) throw new NotFoundError("Unknown plan", "PLAN_NOT_FOUND");

  const course = await prisma.course.findFirst({
    where: { id: courseId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, thumbnail: true },
  });
  if (!course) throw new NotFoundError("Course not found", "COURSE_NOT_FOUND");

  const plan = await prisma.courseAccessPlan.findFirst({
    where: { courseId, type, active: true },
  });
  if (!plan) throw new NotFoundError("Plan not available", "PLAN_NOT_FOUND");

  const enrolled = await prisma.enrollment.findFirst({
    where: {
      studentId,
      courseId,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });

  return {
    course,
    plan: {
      id: PLAN_ENUM_TO_URL[type],
      type,
      label: planLabel(type),
      price: Number(plan.price),
      mrp: Number(plan.mrp),
      durationDays: plan.durationDays ?? planDurationDays(type),
    },
    alreadyEnrolled: !!enrolled,
  };
}

/* ════════════════════════════════════════════════════════════════
   Create order + Razorpay order — POST /orders
   ════════════════════════════════════════════════════════════════ */

export interface CreateOrderResult {
  orderId: string;
  razorpayOrderId: string;
  keyId: string;
  amount: number;             // paise (Razorpay unit)
  currency: "INR";
  name: string;
  description: string;
  prefill: { email: string | null; contact: string | null };
}

const RAZORPAY_DISPLAY_NAME = "Coding Shuttle";

export async function createOrderWithPayment(params: {
  student: StudentPrincipal;
  courseId: string;
  planUrlId: string;
  idempotencyKey: string;
}): Promise<CreateOrderResult> {
  const prisma = await getPrisma();
  const { student, courseId, planUrlId, idempotencyKey } = params;

  // 1. Idempotency fast path — replay if this key was used before.
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey },
    include: {
      course: { select: { title: true } },
      payments: {
        where: { status: "PENDING", gatewayProvider: "RAZORPAY" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (existing) {
    if (existing.studentId !== student.student.id) {
      throw new ConflictError(
        "Idempotency key belongs to another account",
        "IDEMPOTENCY_CONFLICT",
      );
    }
    const pending = existing.payments[0];
    if (!pending || !pending.gatewayOrderId) {
      // Defensive — this should never happen because Order + Payment
      // are created in the same transaction.
      throw new ConflictError(
        "Order exists but has no pending payment; retry with a new idempotency key",
        "ORDER_INCOMPLETE",
      );
    }
    return {
      orderId: existing.id,
      razorpayOrderId: pending.gatewayOrderId,
      keyId: env.RAZORPAY_KEY_ID,
      amount: Math.round(Number(existing.totalAmount) * 100),
      currency: "INR",
      name: RAZORPAY_DISPLAY_NAME,
      description: `${existing.course.title} — ${planLabel(
        existing.planType ?? "ONE_YEAR",
      )}`,
      prefill: {
        email: student.profile.email,
        contact: student.profile.phone,
      },
    };
  }

  // 2. Validate plan, course, enrollment.
  const type = PLAN_URL_TO_ENUM[planUrlId];
  if (!type) throw new NotFoundError("Unknown plan", "PLAN_NOT_FOUND");

  const course = await prisma.course.findFirst({
    where: { id: courseId, status: "PUBLISHED" },
    select: { id: true, title: true },
  });
  if (!course) throw new NotFoundError("Course not found", "COURSE_NOT_FOUND");

  const plan = await prisma.courseAccessPlan.findFirst({
    where: { courseId, type, active: true },
  });
  if (!plan) throw new NotFoundError("Plan not available", "PLAN_NOT_FOUND");

  const alreadyEnrolled = await prisma.enrollment.findFirst({
    where: {
      studentId: student.student.id,
      courseId,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (alreadyEnrolled) {
    throw new ConflictError("You already own this course", "ALREADY_ENROLLED");
  }

  const amountPaise = Math.round(Number(plan.price) * 100);
  if (amountPaise <= 0) {
    throw new BadRequestError("Plan amount is invalid", "AMOUNT_INVALID");
  }

  // 3. Razorpay order BEFORE the DB transaction.
  const razorpay = getRazorpay();
  let rzpOrderId: string;
  try {
    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      // receipt is capped at 40 chars by Razorpay — studentId fits.
      receipt: student.student.id,
      notes: {
        courseId,
        studentId: student.student.id,
      },
    });
    rzpOrderId = rzpOrder.id;
  } catch {
    throw new BadRequestError(
      "Payment gateway rejected order creation",
      "GATEWAY_ERROR",
    );
  }

  // 4. DB transaction: Order + Payment atomically.
  let orderId: string;
  try {
    orderId = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          studentId: student.student.id,
          courseId,
          status: "PENDING",
          amount: plan.price,
          discount: 0,
          tax: 0,
          totalAmount: plan.price,
          currency: "INR",
          accessPlanId: plan.id,
          planType: plan.type,
          planMrp: plan.mrp,
          planPrice: plan.price,
          planDurationDays: plan.durationDays ?? planDurationDays(plan.type),
          couponId: null,
          couponCodeSnapshot: null,
          couponDiscountAmount: 0,
          idempotencyKey,
        },
        select: { id: true },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          amount: plan.price,
          currency: "INR",
          gatewayProvider: "RAZORPAY",
          gatewayOrderId: rzpOrderId,
          gatewayPaymentId: null,
          paidAt: null,
        },
      });

      return order.id;
    });
  } catch (err) {
    // Race on idempotencyKey — another request committed first.
    if ((err as { code?: string }).code === "P2002") {
      const raced = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: {
          course: { select: { title: true } },
          payments: {
            where: { status: "PENDING", gatewayProvider: "RAZORPAY" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      if (raced && raced.studentId === student.student.id) {
        const pending = raced.payments[0];
        if (pending?.gatewayOrderId) {
          return {
            orderId: raced.id,
            razorpayOrderId: pending.gatewayOrderId,
            keyId: env.RAZORPAY_KEY_ID,
            amount: Math.round(Number(raced.totalAmount) * 100),
            currency: "INR",
            name: RAZORPAY_DISPLAY_NAME,
            description: `${raced.course.title} — ${planLabel(
              raced.planType ?? "ONE_YEAR",
            )}`,
            prefill: {
              email: student.profile.email,
              contact: student.profile.phone,
            },
          };
        }
      }
      if (raced) {
        throw new ConflictError(
          "Idempotency key belongs to another account",
          "IDEMPOTENCY_CONFLICT",
        );
      }
    }
    throw err;
  }

  return {
    orderId,
    razorpayOrderId: rzpOrderId,
    keyId: env.RAZORPAY_KEY_ID,
    amount: amountPaise,
    currency: "INR",
    name: RAZORPAY_DISPLAY_NAME,
    description: `${course.title} — ${planLabel(type)}`,
    prefill: {
      email: student.profile.email,
      contact: student.profile.phone,
    },
  };
}