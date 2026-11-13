import Razorpay from "razorpay";

import { env } from "@/config/env";

/**
 * Razorpay client singleton.
 *
 * Initialized once per process. Razorpay's SDK is stateless, so the
 * singleton is just a convenience — no re-init on hot-reload is needed
 * (unlike Prisma/Firebase, there's no connection pool to leak).
 */
let client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (client) return client;
  client = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  return client;
}