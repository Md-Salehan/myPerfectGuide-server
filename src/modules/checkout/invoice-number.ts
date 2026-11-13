import { randomInt } from "node:crypto";

/**
 * Invoice number format: INV-YYYYMMDD-XXXXXX
 *
 * `Invoice.invoiceNumber` is @unique — the DB constraint is the final
 * arbiter if a collision ever occurs. The 6-character suffix keeps
 * same-day collisions vanishingly rare.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateInvoiceNumber(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");

  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `INV-${y}${m}${d}-${suffix}`;
}