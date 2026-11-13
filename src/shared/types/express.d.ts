import type { Profile, Staff, Student } from "@/generated/prisma/client";

/**
 * The authenticated principal attached to `req.user`.
 *
 * A request is either a STUDENT or a STAFF — never both. Downstream code
 * must narrow on `kind` before accessing `student` / `staff`.
 *
 * `profile` is the shared Profile row, always present.
 */
export type AuthenticatedPrincipal =
  | {
    kind: "STUDENT";
    student: Student & { profile: Profile };
    profile: Profile;
  }
  | {
    kind: "STAFF";
    staff: Staff & { profile: Profile };
    profile: Profile;
  };

export interface VerifiedClaims {
  uid: string;
  email: string | null;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: AuthenticatedPrincipal;
      firebaseUid?: string;
      firebaseClaims?: VerifiedClaims;
    }
  }
}

export { };