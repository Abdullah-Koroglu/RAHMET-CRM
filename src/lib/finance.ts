import { Prisma } from "@prisma/client";

export function monthRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

export function sessionChargeAmount(monthlyFee: Prisma.Decimal, sessionCount: number, completedCountBeforeThisSession: number) {
  const base = monthlyFee.div(sessionCount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (completedCountBeforeThisSession < sessionCount - 1) return base;
  return monthlyFee.minus(base.mul(sessionCount - 1));
}
