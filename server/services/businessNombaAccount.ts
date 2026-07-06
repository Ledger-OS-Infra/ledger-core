import { env } from "../config/env";
import { getBusinessById } from "../db/businesses";
import { AppError } from "../lib/AppError";
import { formatBusinessNombaAccount } from "../lib/businesses/nombaAccount";
import type { BusinessNombaAccountView } from "../lib/businesses/nombaAccount";
import type { NombaClient } from "../nomba/client";
import { createNombaClientFromEnv } from "../nomba/client";
import { NombaApiError } from "../nomba/errors";

function mapNombaError(error: unknown): AppError {
  if (error instanceof NombaApiError) {
    return new AppError(
      error.description ?? error.message,
      502,
      "NOMBA_API_ERROR",
    );
  }

  if (error instanceof AppError) {
    return error;
  }

  throw error;
}

export async function getBusinessNombaAccount(
  businessId: string,
  nomba: NombaClient = createNombaClientFromEnv(),
): Promise<BusinessNombaAccountView> {
  const business = await getBusinessById(businessId);

  if (!business) {
    throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
  }

  const subAccountId =
    business.nomba_sub_account_id ?? env.nombaSubAccountId ?? null;

  if (!subAccountId) {
    throw new AppError(
      "Business has no Nomba sub-account configured",
      404,
      "NOMBA_SUB_ACCOUNT_NOT_CONFIGURED",
    );
  }

  try {
    const [details, balance] = await Promise.all([
      nomba.getSubAccountDetails(subAccountId),
      nomba.getSubAccountBalance(subAccountId),
    ]);

    return formatBusinessNombaAccount({ subAccountId, details, balance });
  } catch (error) {
    throw mapNombaError(error);
  }
}
