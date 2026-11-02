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
} from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) Profile + Student
  const studentProfile = await prisma.profile.create({
    data: {
      email: "student@example.com",
      phone: "+919000000001",
      firstName: "Aarav",
      lastName: "Sharma",
      kycStatus: KycStatus.VERIFIED,
    },
  });
  const student = await prisma.student.create({
    data: {
      profileId: studentProfile.id,
      firebaseUid: "seed-student-uid",
      status: UserStatus.ACTIVE,
    },
  });

  // 2) Profile + Staff (ADMIN)
  const adminProfile = await prisma.profile.create({
    data: {
      email: "admin@example.com",
      firstName: "Priya",
      lastName: "Iyer",
      kycStatus: KycStatus.VERIFIED,
    },
  });
  const admin = await prisma.staff.create({
    data: {
      profileId: adminProfile.id,
      firebaseUid: "seed-admin-uid",
      role: StaffRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // 3) Profile + Staff (INSTRUCTOR)
  const instructorProfile = await prisma.profile.create({
    data: {
      email: "instructor@example.com",
      firstName: "Rohan",
      lastName: "Mehta",
      kycStatus: KycStatus.VERIFIED,
    },
  });
  const instructor = await prisma.staff.create({
    data: {
      profileId: instructorProfile.id,
      firebaseUid: "seed-instructor-uid",
      role: StaffRole.INSTRUCTOR,
      status: UserStatus.ACTIVE,
    },
  });

  // 4) Course owned by instructor
  const course = await prisma.course.create({
    data: {
      title: "Full-Stack TypeScript",
      slug: "full-stack-typescript",
      shortDescription: "Build production Node.js apps",
      description: "A comprehensive course.",
      status: CourseStatus.PUBLISHED,
      createdById: instructor.id,
    },
  });

  // 5) Access plans
  const [oneYear, threeYear, lifetime] = await Promise.all([
    prisma.courseAccessPlan.create({
      data: {
        courseId: course.id,
        type: AccessPlanType.ONE_YEAR,
        mrp: "9999.00",
        price: "7999.00",
        durationDays: 365,
      },
    }),
    prisma.courseAccessPlan.create({
      data: {
        courseId: course.id,
        type: AccessPlanType.THREE_YEAR,
        mrp: "19999.00",
        price: "14999.00",
        durationDays: 1095,
      },
    }),
    prisma.courseAccessPlan.create({
      data: {
        courseId: course.id,
        type: AccessPlanType.LIFETIME,
        mrp: "39999.00",
        price: "29999.00",
        durationDays: null,
      },
    }),
  ]);

  // 6) Coupon
  const coupon = await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      type: CouponType.PERCENTAGE,
      value: "10.00",
      validFrom: new Date(),
      maxTotalUses: 100,
      currency: "INR",
    },
  });

  // 7) Enrollment + Order + Payment + Invoice + Redemption (all under student)
  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: student.id,
      courseId: course.id,
      status: EnrollmentStatus.ACTIVE,
      accessPlanId: oneYear.id,
      planType: AccessPlanType.ONE_YEAR,
      expiresAt: new Date(Date.now() + 365 * 86_400_000),
    },
  });

  const order = await prisma.order.create({
    data: {
      studentId: student.id,
      courseId: course.id,
      status: OrderStatus.PAID,
      amount: "7999.00",
      discount: "799.90",
      tax: "1295.84",
      totalAmount: "8494.94",
      currency: "INR",
      enrollmentId: enrollment.id,
      accessPlanId: oneYear.id,
      planType: AccessPlanType.ONE_YEAR,
      planMrp: "9999.00",
      planPrice: "7999.00",
      planDurationDays: 365,
      couponId: coupon.id,
      couponCodeSnapshot: "WELCOME10",
      couponDiscountAmount: "799.90",
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      status: PaymentStatus.PAID,
      amount: "8494.94",
      currency: "INR",
      gatewayProvider: "razorpay",
      gatewayPaymentId: "pay_seed_001",
      gatewayOrderId: "order_seed_001",
      paidAt: new Date(),
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2025-0001",
      orderId: order.id,
      studentId: student.id,
      courseId: course.id,
      status: InvoiceStatus.ISSUED,
      amount: "7999.00",
      tax: "1295.84",
      discount: "799.90",
      totalAmount: "8494.94",
      currency: "INR",
      planType: AccessPlanType.ONE_YEAR,
      planMrp: "9999.00",
      planPrice: "7999.00",
      planDurationDays: 365,
      couponCodeSnapshot: "WELCOME10",
      couponDiscountAmount: "799.90",
      gstin: "29ABCDE1234F1Z5",
      placeOfSupply: "KA",
      cgstAmount: "647.92",
      sgstAmount: "647.92",
      igstAmount: "0.00",
      buyerName: "Aarav Sharma",
      buyerAddress: "Bengaluru, KA, IN",
    },
  });

  await prisma.couponRedemption.create({
    data: {
      couponId: coupon.id,
      studentId: student.id,
      orderId: order.id,
      discountAmount: "799.90",
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete:", {
    profiles: 3,
    students: 1,
    staff: 2,
    adminRole: admin.role,
    instructorRole: instructor.role,
    plans: [oneYear.type, threeYear.type, lifetime.type],
    orderTotal: order.totalAmount,
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });