import type { UserRole } from "@/generated/prisma/client";

/**
 * The authenticated-user shape attached to `req.user`.
 * This is the full Prisma `User` record (see `express.d.ts`); the DTO below is
 * what we send to clients — `firebaseUid` is intentionally excluded.
 */
export interface UserDto {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeResponse {
  user: UserDto;
}