import { createNombaClientFromEnv } from "../nomba/client";
import { NombaValidationError } from "../nomba/errors";
import type { VirtualAccount } from "../nomba/types";

/** accountRef or bank account number — `getVirtualAccount` accepts both */
function sandboxIdentifiers(): string[] {
  const fromEnv = process.env.NOMBA_SANDBOX_VA_IDENTIFIERS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return fromEnv ?? [];
}

function isSandboxVaLimitError(error: unknown): boolean {
  return (
    error instanceof NombaValidationError &&
    (error.description?.includes("2 sandbox virtual accounts") ||
      error.message.includes("2 sandbox virtual accounts"))
  );
}

function printVirtualAccount(account: VirtualAccount): void {
  console.info({
    accountRef: account.accountRef,
    accountName: account.accountName,
    bankAccountNumber: account.bankAccountNumber,
    bankName: account.bankName,
    bankAccountName: account.bankAccountName,
    expired: account.expired,
    createdAt: account.createdAt,
  });
}

async function printKnownAccounts(
  client: ReturnType<typeof createNombaClientFromEnv>,
): Promise<void> {
  const identifiers = sandboxIdentifiers();

  if (identifiers.length === 0) {
    console.warn(
      "Set NOMBA_SANDBOX_VA_IDENTIFIERS in .env (comma-separated accountRef or bank numbers) to fetch existing VAs with getVirtualAccount.",
    );
    return;
  }

  console.info(`Fetching ${identifiers.length} sandbox virtual account(s)...`);
  for (const identifier of identifiers) {
    const account = await client.getVirtualAccount(identifier);
    printVirtualAccount(account);
  }
}

async function main() {
  const client = createNombaClientFromEnv();
  const accountRef = `ref_${Date.now()}`;

  console.info("Creating sandbox virtual account...", { accountRef });

  try {
    const created = await client.createCustomerVirtualAccount({
      accountRef,
      accountName: "Ledger-Core Test Customer",
    });

    const verified = await client.getVirtualAccount(created.accountRef);
    console.info("Created and verified:");
    printVirtualAccount(verified);
    return;
  } catch (error) {
    if (!isSandboxVaLimitError(error)) {
      throw error;
    }

    console.warn(
      "Sandbox VA limit reached (max 2). Fetching known accounts via getVirtualAccount...",
    );
    await printKnownAccounts(client);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
