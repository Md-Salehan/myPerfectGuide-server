import { Router } from "express";

import { asyncHandler } from "@/shared/middleware";
import { authenticate } from "@/modules/auth/authenticate.middleware";
import { getMe } from "@/modules/auth/auth.controller";

export const authRouter = Router();

authRouter.get("/me", asyncHandler(authenticate), getMe);