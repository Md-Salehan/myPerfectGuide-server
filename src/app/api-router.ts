import { Router } from "express";

import { authRouter } from "@/modules/auth/auth.routes";
import { apiLimiter } from "@/shared/middleware";
import { checkoutRouter } from "@/modules/checkout/checkout.routes";

/**
 * `/api/v1` router.
 *
 * `apiLimiter` (Phase 2) is mounted here — not globally — so `/health` stays
 * unthrottled. Domain routers are mounted as each phase lands.
 */
export const apiRouter = Router();

apiRouter.use(apiLimiter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/", checkoutRouter); // /checkout/:id, /orders