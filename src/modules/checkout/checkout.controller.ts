import type { Request, Response } from "express";

import { BadRequestError, UnauthorizedError } from "@/shared/errors";
import { sendCreated, sendSuccess } from "@/shared/responses/api-response";
import { parseOrThrow } from "@/shared/utils/validation";
import type { AuthenticatedPrincipal } from "@/shared/types/express";

import {
  createOrderWithPayment,
  getCheckoutQuote,
} from "./checkout.service";
import { courseIdParamSchema, createOrderBodySchema, quoteQuerySchema } from "./checkout.validation";

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

/** GET /api/v1/checkout/:courseId?plan= */
export async function getQuote(req: Request, res: Response): Promise<void> {
  const student = requireStudentPrincipal(req);
  const { courseId } = parseOrThrow(courseIdParamSchema, req.params);
  const { plan } = parseOrThrow(quoteQuerySchema, req.query);

  const result = await getCheckoutQuote({
    studentId: student.student.id,
    courseId: courseId,
    planUrlId: plan,
  });

  sendSuccess(res, result, "Checkout quote retrieved");
}

/** POST /api/v1/orders */
export async function createOrderHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const student = requireStudentPrincipal(req);

  const idempotencyKey = req.header("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length < 8) {
    throw new BadRequestError(
      "Missing or invalid Idempotency-Key header",
      "IDEMPOTENCY_KEY_REQUIRED",
    );
  }

  const body = parseOrThrow(createOrderBodySchema, req.body);

  const result = await createOrderWithPayment({
    student,
    courseId: body.courseId,
    planUrlId: body.plan,
    idempotencyKey,
  });

  sendCreated(res, result, "Order created and payment initiated");
}