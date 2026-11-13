import { getPrisma } from "@/config/database";
import { getFirebaseAuth } from "@/config/firebase";
import type { Prisma } from "@/generated/prisma/client";
import type {
  PrincipalDto,
  StaffDto,
  StudentDto,
} from "@/modules/auth/auth.types";
import type {
  StaffSignupInput,
  StudentSignupInput,
} from "@/modules/auth/auth.validation";
import { ConflictError, ForbiddenError } from "@/shared/errors";
import type { AuthenticatedPrincipal, VerifiedClaims } from "@/shared/types/express";


/**
 * Resolve an authenticated principal from a verified Firebase UID.
 *
 * Order: Student first, then Staff. A user must never hold both rows
 * (enforced only by convention — @unique is per-table, not cross-table);
 * seed/data-ops must keep this invariant. `authenticate` only calls this.
 */
export async function findPrincipalByFirebaseUid(
  firebaseUid: string,
): Promise<AuthenticatedPrincipal | null> {
  const prisma = await getPrisma();

  const student = await prisma.student.findUnique({
    where: { firebaseUid },
    include: { profile: true },
  });
  if (student) {
    return { kind: "STUDENT", student, profile: student.profile };
  }

  const staff = await prisma.staff.findUnique({
    where: { firebaseUid },
    include: { profile: true },
  });
  if (staff) {
    return { kind: "STAFF", staff, profile: staff.profile };
  }

  return null;
}

/**
 * Create a Student account + Profile in one transaction.
 *
 * Race-safety: `firebaseUid` is @unique on both Student and Staff, so a
 * concurrent duplicate will surface as a Prisma P2002 on one of the inserts
 * and roll the transaction back — we map it to 409 ACCOUNT_EXISTS.
 *
 * Pre-check both tables to give a clean 409 before the transaction attempts
 * the unique-index race (defense in depth).
 */
export async function createStudentAccount(params: {
  firebaseUid: string;
  verifiedClaims: VerifiedClaims;
  input: StudentSignupInput;
}): Promise<AuthenticatedPrincipal> {
  const prisma = await getPrisma();
  const { firebaseUid, verifiedClaims, input } = params;

  await assertNoExistingAccount(firebaseUid);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: {
          ...buildProfileCreate(input),           // enrichment only
          email: verifiedClaims.email ?? undefined,
          phone: verifiedClaims.phone ?? undefined,
          emailVerified: verifiedClaims.emailVerified,
          phoneVerified: verifiedClaims.phoneVerified,
        },
      });
      const student = await tx.student.create({
        data: { profileId: profile.id, firebaseUid },
        include: { profile: true },
      });
      return student;
    });
    return { kind: "STUDENT", student: created, profile: created.profile };
  } catch (err) {
    // existing mapUniqueViolation handles the generic case; add the
    // email/phone distinction only if you want CONTACT_IN_USE vs
    // ACCOUNT_EXISTS to differ for the frontend.
    throw mapUniqueViolation(err, "Account already exists for this identity");
  }
}


export async function loginOrRegisterStudent(params: {
  verifiedClaims: VerifiedClaims;
  input: StudentSignupInput;
}): Promise<{ principal: AuthenticatedPrincipal; created: boolean }> {
  const prisma = await getPrisma();
  const { verifiedClaims, input } = params;

  const existing = await prisma.student.findUnique({
    where: { firebaseUid: verifiedClaims.uid },
    include: { profile: true },
  });

  if (!existing) {
    const principal = await createStudentAccount({
      firebaseUid: verifiedClaims.uid,
      verifiedClaims,
      input,
    });
    return { principal, created: true };
  }

  if (existing.status !== "ACTIVE") {
    throw new ForbiddenError("Account is not active", "ACCOUNT_INACTIVE");
  }

  return {
    principal: { kind: "STUDENT", student: existing, profile: existing.profile },
    created: false,
  };
}


/**
 * Create a Staff account + Profile in one transaction.
 *
 * The role is validated to be INSTRUCTOR | MANAGER by Zod at the controller
 * boundary. This function does NOT re-check — callers must use
 * `staffSignupSchema`.
 */
export async function createStaffAccount(params: {
  firebaseUid: string;
  verifiedClaims: VerifiedClaims;          // NEW
  input: StaffSignupInput;
}): Promise<AuthenticatedPrincipal> {
  const prisma = await getPrisma();
  const { firebaseUid, verifiedClaims, input } = params;
  const { role, ...profileFields } = input;

  await assertNoExistingAccount(firebaseUid);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: {
          ...buildProfileCreate(profileFields),
          email: verifiedClaims.email ?? undefined,
          phone: verifiedClaims.phone ?? undefined,
          emailVerified: verifiedClaims.emailVerified,
          phoneVerified: verifiedClaims.phoneVerified,
        },
      });
      const staff = await tx.staff.create({
        data: { profileId: profile.id, firebaseUid, role },
        include: { profile: true },
      });
      return staff;
    });

    return { kind: "STAFF", staff: created, profile: created.profile };
  } catch (err) {
    throw mapUniqueViolation(err, "Account already exists for this identity");
  }
}

/**
 * Assert no Student OR Staff row exists for this Firebase UID.
 * Throws 409 ACCOUNT_EXISTS if either is present.
 */
async function assertNoExistingAccount(firebaseUid: string): Promise<void> {
  const prisma = await getPrisma();
  const [student, staff] = await Promise.all([
    prisma.student.findUnique({ where: { firebaseUid }, select: { id: true } }),
    prisma.staff.findUnique({ where: { firebaseUid }, select: { id: true } }),
  ]);
  if (student || staff) {
    throw new ConflictError(
      "An account already exists for this identity",
      "ACCOUNT_EXISTS",
    );
  }
}

/**
 * Map a Prisma unique-constraint (P2002) to a 409.
 * Re-throws anything else untouched so the global handler redacts it.
 */
function mapUniqueViolation(err: unknown, message: string): unknown {
  const code = (err as { code?: string }).code;
  if (code === "P2002") {
    return new ConflictError(message, "ACCOUNT_EXISTS");
  }
  return err;
}

/**
 * Build a Prisma Profile.create() payload from optional signup fields.
 * Undefined values are dropped so we never write `null` over a column
 * default (there are none today, but this keeps it future-safe).
 */
function buildProfileCreate(
  input: StudentSignupInput | Omit<StaffSignupInput, "role">,
): Prisma.ProfileCreateInput {
  const data: Prisma.ProfileCreateInput = {};
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.dateOfBirth !== undefined) data.dateOfBirth = input.dateOfBirth;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.address !== undefined) data.address = input.address;
  if (input.city !== undefined) data.city = input.city;
  if (input.state !== undefined) data.state = input.state;
  if (input.postalCode !== undefined) data.postalCode = input.postalCode;
  if (input.country !== undefined) data.country = input.country;
  return data;
}

/**
 * Flatten a principal into a client-facing DTO. Excludes firebaseUid.
 */
export function toPrincipalDto(principal: AuthenticatedPrincipal): PrincipalDto {
  if (principal.kind === "STUDENT") {
    const s = principal.student;
    const p = principal.profile;
    const dto: StudentDto = {
      kind: "STUDENT",
      id: s.id,
      profileId: s.profileId,
      status: s.status,
      email: p.email,
      phone: p.phone,
      firstName: p.firstName,
      lastName: p.lastName,
      kycStatus: p.kycStatus,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
    return dto;
  }

  const st = principal.staff;
  const p = principal.profile;
  const dto: StaffDto = {
    kind: "STAFF",
    id: st.id,
    profileId: st.profileId,
    role: st.role,
    status: st.status,
    email: p.email,
    phone: p.phone,
    firstName: p.firstName,
    lastName: p.lastName,
    kycStatus: p.kycStatus,
    createdAt: st.createdAt.toISOString(),
    updatedAt: st.updatedAt.toISOString(),
  };
  return dto;
}

export async function logoutStudentSession(firebaseUid: string): Promise<void> {
  await getFirebaseAuth().revokeRefreshTokens(firebaseUid);
}

// Re-export for the controller/middleware to throw consistently.
export { ForbiddenError };