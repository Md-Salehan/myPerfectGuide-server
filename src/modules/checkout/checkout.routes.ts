import { Router } from "express";

import { asyncHandler } from "@/shared/middleware";
import { authenticate } from "@/modules/auth/authenticate.middleware";
import { requireStudent } from "@/shared/middleware/authorize";

import { createOrderHandler, getQuote } from "./checkout.controller";
import {
  getOrderHandler,
  verifyPaymentHandler,
} from "./payments.controller";

export const checkoutRouter = Router();

/* Quote */
checkoutRouter.get(
  "/checkout/:courseId",
  asyncHandler(authenticate),
  requireStudent(),
  asyncHandler(getQuote),
);

/* Order (creates internal + Razorpay order + Payment in one call) */
checkoutRouter.post(
  "/orders",
  asyncHandler(authenticate),
  requireStudent(),
  asyncHandler(createOrderHandler),
);

/* Order detail (confirmation page polls this) */
checkoutRouter.get(
  "/orders/:id",
  asyncHandler(authenticate),
  requireStudent(),
  asyncHandler(getOrderHandler),
);

/* Payment verification */
checkoutRouter.post(
  "/payments/verify",
  asyncHandler(authenticate),
  requireStudent(),
  asyncHandler(verifyPaymentHandler),
);