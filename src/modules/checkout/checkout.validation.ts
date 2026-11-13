import { z } from "zod";

import { PLAN_URL_IDS } from "./plan-map";

const planIdSchema = z.enum(PLAN_URL_IDS as [string, ...string[]]);

/** `?plan=` query for GET /checkout/:courseId */
export const quoteQuerySchema = z.object({
  plan: planIdSchema,
});
export type QuoteQuery = z.infer<typeof quoteQuerySchema>;

/** Body for POST /orders */
export const createOrderBodySchema = z.object({
  courseId: z.string().uuid("courseId must be a UUID"),
  plan: planIdSchema,
});
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

/** Path params for GET /checkout/:courseId */
export const courseIdParamSchema = z.object({
  courseId: z.string().uuid("courseId must be a UUID"),
});


/** Body for POST /payments/verify */
export const verifyPaymentBodySchema = z.object({
  orderId: z.string().uuid("orderId must be a UUID"),
  razorpayOrderId: z.string().min(1, "razorpayOrderId is required"),
  razorpayPaymentId: z.string().min(1, "razorpayPaymentId is required"),
  razorpaySignature: z.string().min(1, "razorpaySignature is required"),
});
export type VerifyPaymentBody = z.infer<typeof verifyPaymentBodySchema>;

/** Path param for GET /orders/:id */
export const orderIdParamSchema = z.object({
  id: z.string().uuid("id must be a UUID"),
});
