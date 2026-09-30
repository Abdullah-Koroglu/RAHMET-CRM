export function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export function boundedQuery(value: string | string[] | undefined, max = 100) {
  return z.string().trim().max(max).catch("").parse(single(value));
}

export function pagination(params: Record<string, string | string[] | undefined>) {
  const page = z.coerce.number().int().min(1).max(100000).catch(1).parse(single(params.page) || 1);
  const pageSize = z.coerce.number().int().refine((value) => [25, 50, 100].includes(value)).catch(25).parse(single(params.pageSize) || 25);
  return { page, pageSize, skip: (page - 1) * pageSize };
}
import { z } from "zod";

