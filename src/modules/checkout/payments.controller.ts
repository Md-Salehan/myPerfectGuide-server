import type { Request, Response } from "express";

import { UnauthorizedError } from "@/shared/errors";
import { sendSuccess } from "@/shared/responses/api-response";
import { parseOrThrow } from "@/shared/utils/validation";
import type { AuthenticatedPrincipal } from "@/shared/types/express";

import { getOrderDetail, verifyPayment } from "./payments.service";
import {
  orderIdParamSchema,
  verifyPaymentBodySchema,
} from "./checkout.validation";

function requireStudentPrincipal(
  req: Request,
): Extract<AuthenticatedPrincipal, { kind: "STUDENT" }> {
  if (!req.user || req.user.kind !== "STUDENT") {
    throw new UnauthorizedError(
      "Student authentication required",
      "AUTH_CONTEXT_MISSING",
    );
  }
  return req.user;
}

/** POST /api/v1/payments/verify */
export async function verifyPaymentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const student = requireStudentPrincipal(req);
  const body = parseOrThrow(verifyPaymentBodySchema, req.body);
  const result = await verifyPayment({
    student,
    orderId: body.orderId,
    razorpayOrderId: body.razorpayOrderId,
    razorpayPaymentId: body.razorpayPaymentId,
    razorpaySignature: body.razorpaySignature,
  });
  sendSuccess(res, result, "Payment verified");
}

/** GET /api/v1/orders/:id */
export async function getOrderHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const student = requireStudentPrincipal(req);
  const { id } = parseOrThrow(orderIdParamSchema, req.params);
  const result = await getOrderDetail({ student, orderId: id });
  sendSuccess(res, result, "Order retrieved");
}