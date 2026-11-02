/*
  Warnings:

  - You are about to drop the column `userId` on the `coupon_redemptions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[studentId,courseId]` on the table `enrollments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `profiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `studentId` to the `coupon_redemptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentId` to the `enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentId` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentId` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('INSTRUCTOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN');

-- DropForeignKey
ALTER TABLE "coupon_redemptions" DROP CONSTRAINT "coupon_redemptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_createdById_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_userId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_userId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_userId_fkey";

-- DropIndex
DROP INDEX "coupon_redemptions_couponId_userId_idx";

-- DropIndex
DROP INDEX "coupon_redemptions_userId_idx";

-- DropIndex
DROP INDEX "enrollments_userId_courseId_key";

-- DropIndex
DROP INDEX "enrollments_userId_status_idx";

-- DropIndex
DROP INDEX "invoices_userId_issuedAt_idx";

-- DropIndex
DROP INDEX "orders_userId_createdAt_idx";

-- DropIndex
DROP INDEX "profiles_userId_key";

-- AlterTable
ALTER TABLE "coupon_redemptions" DROP COLUMN "userId",
ADD COLUMN     "studentId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "enrollments" DROP COLUMN "userId",
ADD COLUMN     "studentId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "userId",
ADD COLUMN     "studentId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "userId",
ADD COLUMN     "studentId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "fullName",
DROP COLUMN "userId",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT;

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_profileId_key" ON "students"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "students_firebaseUid_key" ON "students"("firebaseUid");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profileId_key" ON "staff"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_firebaseUid_key" ON "staff"("firebaseUid");

-- CreateIndex
CREATE INDEX "staff_role_idx" ON "staff"("role");

-- CreateIndex
CREATE INDEX "staff_status_idx" ON "staff"("status");

-- CreateIndex
CREATE INDEX "coupon_redemptions_couponId_studentId_idx" ON "coupon_redemptions"("couponId", "studentId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_studentId_idx" ON "coupon_redemptions"("studentId");

-- CreateIndex
CREATE INDEX "enrollments_studentId_status_idx" ON "enrollments"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_studentId_courseId_key" ON "enrollments"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "invoices_studentId_issuedAt_idx" ON "invoices"("studentId", "issuedAt");

-- CreateIndex
CREATE INDEX "orders_studentId_createdAt_idx" ON "orders"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_phone_key" ON "profiles"("phone");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
