import type { Request, Response } from "express";

import { sendSuccess } from "@/shared/responses/api-response";
import { toUserDto } from "@/modules/auth/auth.service";

/**
 * GET /api/v1/auth/me
 *
 * Returns the authenticated user (DTO). `authenticate` guarantees `req.user`.
 */
export function getMe(req: Request, res: Response): void {
  const user = req.user!;
  sendSuccess(res, { user: toUserDto(user) }, "Authenticated user retrieved");
}