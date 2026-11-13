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

const SUPER_ADMIN_FIREBASE_UID =
  "N5qolrMyaeeNS2covFJVNeIX4af1";

const courses = [
  {
    slug: "complete-taxation-compliance",
    title: "Complete Taxation & Compliance Course 2026",
    description:
      "From Fundamentals to Client Acquisition: GST, ITR, Accounting & Digital Marketing. Includes GST and ITR training, portfolio website building, digital marketing, client acquisition and real-world projects.",
    shortDescription: "Taxation & Compliance",
    thumbnail:
      "/images/course-detail-asset/taxation/thumbnail.png",
    status: "PUBLISHED" as const,

    plans: [
      {
        type: "ONE_YEAR" as const,
        mrp: "15990.00",
        price: "1599.00",
        durationDays: 365,
        active: true,
      },
      {
        type: "LIFETIME" as const,
        mrp: "19990.00",
        price: "2999.00",
        durationDays: null,
        active: true,
      },
    ],
  },

  {
    slug: "digital-marketing-2026",
    title: "Digital Marketing & Client Acquisition System 2026",
    description:
      "Build your portfolio website and learn Facebook Ads, Instagram Ads, Google Ads, SEO, LinkedIn and WhatsApp outreach. Includes client acquisition strategies, service packaging, pricing, referral system design, internships and placement assistance.",

    shortDescription: "Digital & Performance Marketing",
    thumbnail: "/img/marketing-promo.jpg",
    status: "DRAFT" as const,

    plans: [
      {
        type: "ONE_YEAR" as const,
        mrp: "10000.00",
        price: "4999.00",
        durationDays: 365,
        active: true,
      },
      {
        type: "LIFETIME" as const,
        mrp: "60000.00",
        price: "14999.00",
        durationDays: null,
        active: true,
      },
    ],
  },

  {
    slug: "web-development-2026",
    title: "Full Stack Web Development Bootcamp 2026",
    description:
      "Build and deploy real-world full-stack applications using HTML, CSS, JavaScript, React, TypeScript, Node.js, Express and MongoDB. Includes deployment, system design fundamentals, portfolio development and interview preparation.",

    shortDescription: "Full-Stack Web Development",
    thumbnail: "/img/web-dev-promo.jpg",
    status: "DRAFT" as const,

    plans: [
      {
        type: "ONE_YEAR" as const,
        mrp: "24999.00",
        price: "4999.00",
        durationDays: 365,
        active: true,
      },
      {
        type: "LIFETIME" as const,
        mrp: "34999.00",
        price: "7999.00",
        durationDays: null,
        active: true,
      },
    ],
  },
];

async function main() {

  try {
    await prisma.$transaction(
      async (tx) => {
        // 1. Find existing Super Admin
        const superAdmin = await tx.staff.findUnique({
          where: {
            firebaseUid: SUPER_ADMIN_FIREBASE_UID,
          },
        });

        if (!superAdmin) {
          throw new Error(
            "Super Admin not found. Seed the Super Admin first."
          );
        }

        if (
          superAdmin.role !== "SUPER_ADMIN" ||
          superAdmin.status !== "ACTIVE"
        ) {
          throw new Error(
            "The specified staff account is not an active SUPER_ADMIN."
          );
        }

        console.log("Super Admin verified:", superAdmin.id);

        // 2. Seed courses and access plans
        for (const courseData of courses) {
          const { plans, ...courseFields } = courseData;

          // Create or update course
          const course = await tx.course.upsert({
            where: {
              slug: courseFields.slug,
            },

            update: {
              ...courseFields,
              createdById: superAdmin.id,
            },

            create: {
              ...courseFields,
              createdById: superAdmin.id,
            },
          });

          console.log(`Course seeded: ${course.title}`);

          // 3. Create or update access plans
          for (const planData of plans) {
            const plan = await tx.courseAccessPlan.upsert({
              where: {
                courseId_type: {
                  courseId: course.id,
                  type: planData.type,
                },
              },

              update: {
                mrp: planData.mrp,
                price: planData.price,
                durationDays: planData.durationDays,
                active: planData.active,
              },

              create: {
                courseId: course.id,
                ...planData,
              },
            });

            console.log(
              `  Plan: ${plan.type} | ₹${plan.price.toString()}`
            );
          }
        }
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    console.log("\nAll courses and access plans seeded successfully!");
  } catch (error) {
    console.error("Course seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
