import type { NextFunction, Request, Response } from "express";

import { getFirebaseAuth } from "@/config/firebase";
import { findPrincipalByFirebaseUid } from "@/modules/auth/auth.service";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/shared/errors";
import { VerifiedClaims } from "@/shared/types/express";

/** Build the trusted-claims object from verified token claims. */
function buildClaims(decoded: {
  uid: string;
  email?: string;
  phone_number?: string;
  email_verified?: boolean;
}): VerifiedClaims {
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    phone: decoded.phone_number ?? null,
    emailVerified: !!decoded.email && decoded.email_verified === true,
    phoneVerified: !!decoded.phone_number,
  };
}

/**
 * Token-only verifier. Attaches `req.firebaseUid` + `req.firebaseClaims`.
 * Does NOT require a local principal.
 *
 * Use on /auth/login/student and /auth/signup/staff — the caller has
 * a valid Firebase session but may not have a Student/Staff row yet.
 */
export async function verifyFirebase(
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

    const decoded = await verifyFirebaseToken(idToken);
    req.firebaseUid = decoded.uid;
    req.firebaseClaims = buildClaims(decoded);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Full auth: token + local principal.
 * Never creates accounts — use /auth/login/student for that.
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

    const decoded = await verifyFirebaseToken(idToken);
    const principal = await findPrincipalByFirebaseUid(decoded.uid);

    if (!principal) {
      throw new NotFoundError(
        "No account for this identity; call /auth/login/student first",
        "ACCOUNT_NOT_FOUND",
      );
    }

    const status =
      principal.kind === "STUDENT"
        ? principal.student.status
        : principal.staff.status;

    if (status !== "ACTIVE") {
      throw new ForbiddenError("Account is not active", "ACCOUNT_INACTIVE");
    }

    req.user = principal;
    req.firebaseUid = decoded.uid;
    req.firebaseClaims = buildClaims(decoded);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Shared token verification with stable error mapping.
 * `checkRevoked: true` is what makes `POST /auth/logout` enforceable.
 */
export async function verifyFirebaseToken(idToken: string) {
  try {
    return await getFirebaseAuth().verifyIdToken(idToken, true);
  } catch (err) {
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
    const e = new Error("Firebase token verification failed") as Error & {
      isOperational?: boolean;
    };
    e.isOperational = false;
    throw e;
  }
}