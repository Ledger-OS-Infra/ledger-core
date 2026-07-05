import { z } from "zod";

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Default page size for recent transaction / obligation feeds. */
export const recentListPaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  match_status: z.enum(["matched", "unmatched"]).optional(),
});

export const agingListQuery = paginationQuery.extend({
  bucket: z
    .enum([
      "current",
      "1_30_days",
      "31_60_days",
      "61_90_days",
      "90_plus_days",
    ])
    .optional(),
  summary_only: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;
export type RecentListPaginationQuery = z.infer<typeof recentListPaginationQuery>;
export type AgingListQuery = z.infer<typeof agingListQuery>;

export const monthlyInflowQuery = z.object({
  months: z.coerce.number().int().min(1).max(12).default(6),
});

export type MonthlyInflowQuery = z.infer<typeof monthlyInflowQuery>;
