import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { sessionChargeAmount } from "./finance";

describe("sessionChargeAmount", () => {
  it("splits a monthly fee evenly across sessions", () => {
    expect(sessionChargeAmount(new Prisma.Decimal("10"), 4, 0).toString()).toBe("2.5");
  });

  it("puts the rounding remainder on the final session", () => {
    const fee = new Prisma.Decimal("10");
    const values = [0, 1, 2].map((index) => sessionChargeAmount(fee, 3, index));
    expect(values.reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0)).toString()).toBe("10");
    expect(values[2].toString()).toBe("3.34");
  });
});
