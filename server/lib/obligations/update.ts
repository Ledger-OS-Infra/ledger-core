import { AppError } from "../AppError";
import {
  parseStoredAmount,
  type PaymentObligationRow,
} from "./format";

export interface ObligationUpdateInput {
  type?: PaymentObligationRow["obligation_type"];
  amount?: number;
  dueDate?: string;
  referenceCode?: string | null;
  metadata?: Record<string, unknown>;
}

interface UpdateRule {
  violated: boolean;
  message: string;
  code: string;
}

function updateRules(
  existing: PaymentObligationRow,
  input: ObligationUpdateInput,
): UpdateRule[] {
  const amountPaid = parseStoredAmount(existing.amount_paid);
  const storedAmount = parseStoredAmount(existing.amount);

  return [
    {
      violated: input.type !== undefined && amountPaid > 0,
      message: "Cannot change obligation type after payments have been applied",
      code: "OBLIGATION_IMMUTABLE",
    },
    {
      violated: input.amount !== undefined && input.amount < amountPaid,
      message: "Amount cannot be less than amount already paid",
      code: "OBLIGATION_AMOUNT_CONFLICT",
    },
    {
      violated:
        input.amount !== undefined &&
        amountPaid > 0 &&
        input.amount !== storedAmount,
      message: "Cannot change amount after payments have been applied",
      code: "OBLIGATION_IMMUTABLE",
    },
  ];
}

export function validateObligationUpdate(
  existing: PaymentObligationRow,
  input: ObligationUpdateInput,
): void {
  const failed = updateRules(existing, input).find((rule) => rule.violated);

  if (failed) {
    throw new AppError(failed.message, 409, failed.code);
  }
}

const PATCH_MAP: Record<
  keyof ObligationUpdateInput,
  {
    column: string;
    cast?: string;
    serialize?: (value: unknown) => string | number | null;
  }
> = {
  type: { column: "obligation_type" },
  amount: { column: "amount" },
  dueDate: { column: "due_date" },
  referenceCode: { column: "reference_code" },
  metadata: {
    column: "metadata",
    cast: "jsonb",
    serialize: (value) => JSON.stringify(value),
  },
};

export function buildObligationUpdatePatch(input: ObligationUpdateInput): {
  assignments: string[];
  values: Array<string | number | null>;
} {
  const patches = (
    Object.entries(PATCH_MAP) as Array<
      [keyof ObligationUpdateInput, (typeof PATCH_MAP)[keyof ObligationUpdateInput]]
    >
  ).flatMap(([key, { column, cast, serialize }]) => {
    const value = input[key];
    if (value === undefined) {
      return [];
    }

    return [
      {
        column,
        cast,
        sqlValue: serialize ? serialize(value) : (value as string | number | null),
      },
    ];
  });

  return {
    values: patches.map((patch) => patch.sqlValue),
    assignments: patches.map(
      (patch, index) =>
        `${patch.column} = $${index + 1}${patch.cast ? `::${patch.cast}` : ""}`,
    ),
  };
}
