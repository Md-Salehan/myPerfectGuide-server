import { User } from "@/generated/prisma/client";

/**
 * Module augmentation for Express Request.
 *
 * We attach request-scoped fields here so downstream middleware/services can
 * rely on them without re-declaring casts. Later phases add `user` (Phase 4).
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      user?: User;
      firebaseUid?: string;
    }
  }
}

export { };