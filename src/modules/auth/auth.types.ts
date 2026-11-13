import type { StaffRole } from "@/generated/prisma/client";
import type { AuthenticatedPrincipal } from "@/shared/types/express";

/**
 * Client-facing principal DTO — flattened from the discriminated union.
 *
 * `id` is the Student.id or Staff.id (NOT Profile.id), because ownership
 * checks downstream key off `studentId` / `staffId`.
 */
export interface StudentDto {
  kind: "STUDENT";
  id: string;
  profileId: string;
  status: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  kycStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffDto {
  kind: "STAFF";
  id: string;
  profileId: string;
  role: StaffRole;
  status: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  kycStatus: string;
  createdAt: string;
  updatedAt: string;
}

export type PrincipalDto = StudentDto | StaffDto;

export interface MeResponse {
  user: PrincipalDto;
}

/** Internal shape returned by findPrincipalByFirebaseUid. */
export type Principal = AuthenticatedPrincipal;