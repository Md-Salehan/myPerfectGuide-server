import type { NextFunction, Request, Response } from "express";

import { getFirebaseAuth } from "@/config/firebase";
import {
  ForbiddenError,
  UnauthorizedError,
} from "@/shared/errors";
import { findOrCreateUser } from "@/modules/auth/auth.service";

/**
 * Extracts and verifies a Firebase ID token, then resolves the local user.
 *
 * Flow:
 *   1. `Authorization: Bearer <token>` → extract token.
 *   2. `admin.auth().verifyIdToken(token)` → decoded claims (uid, email, phone).
 *   3. `findOrCreateUser` on `firebaseUid` → local `User`.
 *   4. Reject non-ACTIVE users.
 *   5. Attach `req.user` and `req.firebaseUid`.
 *
 * The frontend-supplied `userId` is NEVER trusted; identity comes exclusively
 * from the verified token.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.header("authorization");
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        "Missing or malformed Authorization header",
        "MISSING_AUTH_TOKEN",
      );
    }

    const idToken = header.slice("Bearer ".length).trim();
    if (!idToken) {
      throw new UnauthorizedError("Empty bearer token", "MISSING_AUTH_TOKEN");
    }

    let decoded;
    try {
      decoded = await getFirebaseAuth().verifyIdToken(idToken);
    } catch (err) {
      // Map Firebase's stable error codes to our error envelope.
      const code = (err as { code?: string }).code;
      if (code === "auth/id-token-expired") {
        throw new UnauthorizedError("Firebase ID token has expired", "TOKEN_EXPIRED");
      }
      if (
        code === "auth/id-token-revoked" ||
        code === "auth/invalid-id-token" ||
        code === "auth/argument-error"
      ) {
        throw new UnauthorizedError("Firebase ID token is invalid", "INVALID_TOKEN");
      }
      // Unknown Admin SDK error (network/misconfig) → non-operational 500.
      const e = new Error("Firebase token verification failed") as Error & {
        isOperational?: boolean;
      };
      e.isOperational = false;
      throw e;
    }

    const user = await findOrCreateUser({
      firebaseUid: decoded.uid,
      email: decoded.email ?? null,
      phone: decoded.phone_number ?? null,
    });

    if (user.status !== "ACTIVE") {
      throw new ForbiddenError("Account is not active", "ACCOUNT_INACTIVE");
    }

    req.user = user;
    req.firebaseUid = decoded.uid;
    next();
  } catch (err) {
    next(err);
  }
}