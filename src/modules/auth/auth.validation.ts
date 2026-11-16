import { email, z } from "zod";

/**
 * Shared optional profile fields accepted on signup.
 *
 * Kept loose here; Phase 5 (Profiles/KYC) hardens these with per-field
 * validation (PAN regex, Aadhaar regex, DOB range, etc.).
 */
const profileFieldsSchema = z.object({
  email: z.email().optional(),
  phone: z
    .string()
    .min(7)
    .max(20)
    .optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
});

const loginRegisterSchema = z.object({
  email: z.email().optional(),
  phone: z
    .string()
    .min(7)
    .max(20)
    .optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),

});

export const loginRegisterInputSchema = loginRegisterSchema;
export type LoginRegisterInput = z.infer<typeof loginRegisterSchema>;
export type StudentSignupInput = z.infer<typeof loginRegisterSchema>;

/**
 * Staff signup — public endpoint.
 *
 * SECURITY: Only INSTRUCTOR and MANAGER may self-register. ADMIN and
 * SUPER_ADMIN must be seeded or created by an existing SUPER_ADMIN via a
 * later admin user-management endpoint. Allowing them here would be a
 * privilege-escalation vulnerability.
 */
export const staffSignupSchema = profileFieldsSchema.extend({
  role: z.enum(["INSTRUCTOR", "MANAGER"]),
});
export type StaffSignupInput = z.infer<typeof staffSignupSchema>;