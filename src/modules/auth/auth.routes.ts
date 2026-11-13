import { Router } from "express";

import { asyncHandler } from "@/shared/middleware";
import {
  authenticate,
  verifyFirebase,
} from "@/modules/auth/authenticate.middleware";
import {
  getMe,
  loginStudent,
  logout,
  signupStaff,
} from "@/modules/auth/auth.controller";

export const authRouter = Router();

/* ------------------------------------------------------------
   Token-verified, principal-optional (login-or-register, signup).
   These callers have a valid Firebase session but may not have
   a local Student/Staff row yet → `verifyFirebase`, not
   `authenticate`.
   ------------------------------------------------------------ */
authRouter.post(
  "/login/student",
  asyncHandler(verifyFirebase),
  asyncHandler(loginStudent),
);

authRouter.post(
  "/signup/staff",
  asyncHandler(verifyFirebase),
  asyncHandler(signupStaff),
);

/* ------------------------------------------------------------
   Fully authenticated.
   ------------------------------------------------------------ */
authRouter.get("/me", asyncHandler(authenticate), getMe);

authRouter.post(
  "/logout",
  asyncHandler(authenticate),
  asyncHandler(logout),
);