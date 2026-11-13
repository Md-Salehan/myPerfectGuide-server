import type { Request, Response } from "express";

import {
  createStaffAccount,
  loginOrRegisterStudent,
  logoutStudentSession,
  toPrincipalDto,
} from "@/modules/auth/auth.service";
import {
  staffSignupSchema,
  studentSignupSchema,
} from "@/modules/auth/auth.validation";
import { UnauthorizedError } from "@/shared/errors";
import { sendCreated, sendSuccess } from "@/shared/responses/api-response";
import { parseOrThrow } from "@/shared/utils/validation";


function requireAuthContext(req: Request) {
  if (!req.firebaseUid || !req.firebaseClaims) {
    throw new UnauthorizedError(
      "Authentication context missing",
      "AUTH_CONTEXT_MISSING",
    );
  }
  return { firebaseUid: req.firebaseUid, firebaseClaims: req.firebaseClaims };
}

/* ------------------------------------------------------------
   POST /api/v1/auth/login/student
   ------------------------------------------------------------
   Idempotent student authentication.
   - 201 Created  when the caller had no local Student (auto-registered)
   - 200 OK       when the caller already had a local Student
   Rejects:
   - 403 ACCOUNT_INACTIVE (existing Student is SUSPENDED/DELETED)
   - 409 CONTACT_IN_USE   (token email/phone belongs to another account)
   ------------------------------------------------------------ */
export async function loginStudent(req: Request, res: Response): Promise<void> {
  const { firebaseClaims } = requireAuthContext(req);
  const input = parseOrThrow(studentSignupSchema, req.body ?? {});

  const { principal, created } = await loginOrRegisterStudent({
    verifiedClaims: firebaseClaims,
    input,
  });

  if (created) {
    sendCreated(res, { user: toPrincipalDto(principal) }, "Student account created");
  } else {
    sendSuccess(res, { user: toPrincipalDto(principal) }, "Login successful");
  }
}

/* ------------------------------------------------------------
   POST /api/v1/auth/signup/staff
   ------------------------------------------------------------
   Explicit staff registration. Role is restricted by Zod to
   INSTRUCTOR | MANAGER — no auto-register on login for staff.
   ------------------------------------------------------------ */
export async function signupStaff(req: Request, res: Response): Promise<void> {
  const { firebaseUid, firebaseClaims } = requireAuthContext(req);
  const input = parseOrThrow(staffSignupSchema, req.body ?? {});
  const principal = await createStaffAccount({
    firebaseUid,
    verifiedClaims: firebaseClaims,
    input,
  });
  sendCreated(res, { user: toPrincipalDto(principal) }, "Staff account created");
}

/* ------------------------------------------------------------
   GET /api/v1/auth/me
   ------------------------------------------------------------ */
export function getMe(req: Request, res: Response): void {
  const user = req.user!;
  sendSuccess(res, { user: toPrincipalDto(user) }, "Authenticated principal retrieved");
}

/* ------------------------------------------------------------
   POST /api/v1/auth/logout
   ------------------------------------------------------------ */
export async function logout(req: Request, res: Response): Promise<void> {
  const { firebaseUid } = requireAuthContext(req);
  await logoutStudentSession(firebaseUid);
  res.status(204).end();
}