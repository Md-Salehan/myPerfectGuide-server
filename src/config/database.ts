import { PrismaPg } from "@prisma/adapter-pg";

import { env, isProduction } from "@/config/env";
import { PrismaClient } from "../generated/prisma/client";

function createPrisma() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["warn", "error"],
  });
}

type PrismaInstance = ReturnType<typeof createPrisma>;

// Reuse one client across hot reloads in dev so the pool isn't exhausted.
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaInstance };

export const prisma: PrismaInstance = globalForPrisma.__prisma ?? createPrisma();

if (!isProduction) {
  globalForPrisma.__prisma = prisma;
}

export const getPrisma = (): PrismaInstance => prisma;

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}