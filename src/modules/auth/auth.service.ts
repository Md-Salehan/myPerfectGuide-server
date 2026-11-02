import type { User } from "@/generated/prisma/client";
import { getPrisma } from "@/config/database";
import type { UserDto } from "@/modules/auth/auth.types";

/**
 * Find the local user by Firebase UID, creating it on first sight.
 *
 * `upsert` on the unique `firebaseUid` is race-safe: two concurrent first
 * requests for the same Firebase user will result in exactly one row.
 *
 * `update: {}` is intentional — subsequent logins must not mutate the user
 * record. Profile changes go through the profiles module (Phase 5).
 */
export async function findOrCreateUser(params: {
  firebaseUid: string;
  email?: string | null;
  phone?: string | null;
}): Promise<User> {
  const prisma = await getPrisma();

  return prisma.user.upsert({
    where: { firebaseUid: params.firebaseUid },
    update: {},
    create: {
      firebaseUid: params.firebaseUid,
      email: params.email ?? null,
      phone: params.phone ?? null,
    },
  });
}

/**
 * Map a Prisma User to the client-facing DTO. Strips `firebaseUid`.
 */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}