import { z } from "zod";

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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
});

export type PaginationQuery = z.infer<typeof paginationQuery>;
export type AgingListQuery = z.infer<typeof agingListQuery>;
