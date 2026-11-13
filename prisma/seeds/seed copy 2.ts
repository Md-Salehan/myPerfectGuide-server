import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  StaffRole,
  UserStatus,
  KycStatus,
  CourseStatus,
  AccessPlanType,
  EnrollmentStatus,
  OrderStatus,
  PaymentStatus,
  InvoiceStatus,
  CouponType,
} from "../../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {

  const superAdminData = {
    firebaseUid: "N5qolrMyaeeNS2covFJVNeIX4af1",

    profile: {
      email: "mdsalehan.official@gmail.com",
      phone: "6290017920",

      firstName: "md",
      lastName: "salehan",

      emailVerified: false,
      phoneVerified: false,

      // DD/MM/YYYY: 10 November 2021
      dateOfBirth: new Date("2021-11-10T00:00:00.000Z"),

      gender: "M",

      address: "Metiabruz",
      city: "Kolkata",
      state: "WB",
      postalCode: "700024",
      country: "IND",

      profileImage: "https://profile.com/superadmin.png",

      // Placeholders are stored as null.
      // Replace with genuine verified details when available.
      panNumber: null,
      aadhaarNumber: null,

      kycStatus: "PENDING" as const,
    },
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Create or update the Profile.
      const profile = await tx.profile.upsert({
        where: {
          email: superAdminData.profile.email,
        },

        update: {
          ...superAdminData.profile,
        },

        create: {
          ...superAdminData.profile,
        },
      });

      // Step 2: Create or update the Staff account.
      const staff = await tx.staff.upsert({
        where: {
          firebaseUid: superAdminData.firebaseUid,
        },

        update: {
          profileId: profile.id,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },

        create: {
          firebaseUid: superAdminData.firebaseUid,
          profileId: profile.id,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      });

      return {
        profile,
        staff,
      };
    });

    console.log("Super Admin seeded successfully!");

    console.log({
      staffId: result.staff.id,
      profileId: result.profile.id,
      firebaseUid: result.staff.firebaseUid,
      role: result.staff.role,
      status: result.staff.status,
      email: result.profile.email,
    });
  } catch (error) {
    console.error("Error seeding Super Admin:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});