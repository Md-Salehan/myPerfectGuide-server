import type { AccessPlanType } from "@/generated/prisma/client";

/**
 * URL plan id ↔ Prisma AccessPlanType. Frontend uses the short ids
 * in `?plan=`, backend resolves them to the enum. Keep this in sync
 * with the frontend's `src/pages/checkout/constants.ts`.
 */
export const PLAN_URL_TO_ENUM: Record<string, AccessPlanType> = {
  year: "ONE_YEAR",
  threeyear: "THREE_YEAR",
  life: "LIFETIME",
};

export const PLAN_ENUM_TO_URL: Record<AccessPlanType, string> = {
  ONE_YEAR: "year",
  THREE_YEAR: "threeyear",
  LIFETIME: "life",
};

export const PLAN_URL_IDS = Object.keys(PLAN_URL_TO_ENUM) as Array<
  keyof typeof PLAN_URL_TO_ENUM
>;

/** Duration in days for a plan. `null` = lifetime. */
export function planDurationDays(type: AccessPlanType): number | null {
  switch (type) {
    case "ONE_YEAR":
      return 365;
    case "THREE_YEAR":
      return 365 * 3;
    case "LIFETIME":
      return null;
  }
}

/** Human label used in the invoice / Razorpay description. */
export function planLabel(type: AccessPlanType): string {
  switch (type) {
    case "ONE_YEAR":
      return "1 Year";
    case "THREE_YEAR":
      return "3 Years";
    case "LIFETIME":
      return "Lifetime";
  }
}