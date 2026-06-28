import type { Pool, PoolClient } from "pg";
import { pool } from "./pool";

export type CustomerStatus = "ACTIVE" | "INACTIVE";

export interface CustomerRow {
  id: string;
  business_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: CustomerStatus;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface VirtualAccountRow {
  id: string;
  customer_id: string;
  nomba_account_ref: string;
  account_number: string;
  bank_name: string;
  bank_code: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface CustomerWithVirtualAccount extends CustomerRow {
  virtual_account: VirtualAccountRow;
}

export interface CreateCustomerInput {
  id: string;
  businessId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateVirtualAccountInput {
  id: string;
  customerId: string;
  nombaAccountRef: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string | null;
}

export interface UpdateCustomerInput {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  status?: CustomerStatus;
  metadata?: Record<string, unknown>;
}

type DbClient = Pool | PoolClient;

interface CustomerWithVaQueryRow extends CustomerRow {
  va_id: string;
  va_customer_id: string;
  va_nomba_account_ref: string;
  va_account_number: string;
  va_bank_name: string;
  va_bank_code: string | null;
  va_is_active: boolean;
  va_created_at: Date;
}

function parseJsonColumn<T extends Record<string, unknown>>(value: unknown): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return (value ?? {}) as T;
}

function mapCustomerRow(row: CustomerRow): CustomerRow {
  return {
    ...row,
    metadata: parseJsonColumn(row.metadata),
  };
}

function mapCustomerWithVaRow(row: CustomerWithVaQueryRow): CustomerWithVirtualAccount {
  const customer = mapCustomerRow(row);
  return {
    ...customer,
    virtual_account: {
      id: row.va_id,
      customer_id: row.va_customer_id,
      nomba_account_ref: row.va_nomba_account_ref,
      account_number: row.va_account_number,
      bank_name: row.va_bank_name,
      bank_code: row.va_bank_code,
      is_active: row.va_is_active,
      created_at: row.va_created_at,
    },
  };
}

const CUSTOMER_WITH_VA_SELECT = `
  SELECT
    c.id,
    c.business_id,
    c.full_name,
    c.email,
    c.phone,
    c.status,
    c.metadata,
    c.created_at,
    c.updated_at,
    va.id AS va_id,
    va.customer_id AS va_customer_id,
    va.nomba_account_ref AS va_nomba_account_ref,
    va.account_number AS va_account_number,
    va.bank_name AS va_bank_name,
    va.bank_code AS va_bank_code,
    va.is_active AS va_is_active,
    va.created_at AS va_created_at
  FROM customers c
  JOIN virtual_accounts va ON va.customer_id = c.id
`;

export async function businessExists(businessId: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM businesses WHERE id = $1) AS exists`,
    [businessId],
  );
  return rows[0]?.exists ?? false;
}

export async function insertCustomer(
  input: CreateCustomerInput,
  client: DbClient = pool,
): Promise<CustomerRow> {
  const { rows } = await client.query<CustomerRow>(
    `INSERT INTO customers (id, business_id, full_name, email, phone, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.id,
      input.businessId,
      input.fullName,
      input.email ?? null,
      input.phone ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return mapCustomerRow(rows[0]);
}

export async function insertVirtualAccount(
  input: CreateVirtualAccountInput,
  client: DbClient = pool,
): Promise<VirtualAccountRow> {
  const { rows } = await client.query<VirtualAccountRow>(
    `INSERT INTO virtual_accounts (
       id,
       customer_id,
       nomba_account_ref,
       account_number,
       bank_name,
       bank_code
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.id,
      input.customerId,
      input.nombaAccountRef,
      input.accountNumber,
      input.bankName,
      input.bankCode ?? null,
    ],
  );

  return rows[0];
}

export async function insertCustomerWallet(
  customerId: string,
  client: DbClient = pool,
): Promise<void> {
  await client.query(
    `INSERT INTO customer_wallets (customer_id, balance)
     VALUES ($1, 0)`,
    [customerId],
  );
}

export async function getCustomerById(
  customerId: string,
): Promise<CustomerWithVirtualAccount | null> {
  const { rows } = await pool.query<CustomerWithVaQueryRow>(
    `${CUSTOMER_WITH_VA_SELECT}
     WHERE c.id = $1`,
    [customerId],
  );

  const row = rows[0];
  return row ? mapCustomerWithVaRow(row) : null;
}

export async function listCustomersByBusiness(
  businessId: string,
): Promise<CustomerWithVirtualAccount[]> {
  const { rows } = await pool.query<CustomerWithVaQueryRow>(
    `${CUSTOMER_WITH_VA_SELECT}
     WHERE c.business_id = $1
     ORDER BY c.full_name ASC, c.created_at ASC`,
    [businessId],
  );

  return rows.map(mapCustomerWithVaRow);
}

export async function findCustomerByAccountNumber(
  accountNumber: string,
): Promise<CustomerWithVirtualAccount | null> {
  const { rows } = await pool.query<CustomerWithVaQueryRow>(
    `${CUSTOMER_WITH_VA_SELECT}
     WHERE va.account_number = $1
       AND va.is_active = TRUE`,
    [accountNumber],
  );

  const row = rows[0];
  return row ? mapCustomerWithVaRow(row) : null;
}

type CustomerPatchField = {
  key: keyof UpdateCustomerInput;
  column: string;
  serialize?: (value: unknown) => unknown;
};

const CUSTOMER_PATCH_FIELDS: CustomerPatchField[] = [
  { key: "fullName", column: "full_name" },
  { key: "email", column: "email" },
  { key: "phone", column: "phone" },
  { key: "status", column: "status" },
  {
    key: "metadata",
    column: "metadata",
    serialize: (value) => JSON.stringify(value),
  },
];

function buildCustomerPatch(input: UpdateCustomerInput): {
  setClauses: string[];
  values: unknown[];
} {
  const patches = CUSTOMER_PATCH_FIELDS.flatMap(({ key, column, serialize }) => {
    const value = input[key];
    if (value === undefined) {
      return [];
    }

    return [
      {
        column,
        value: serialize ? serialize(value) : value,
      },
    ];
  });

  const setClauses = patches.map(({ column }, index) => `${column} = $${index + 1}`);
  const values = patches.map(({ value }) => value);

  return { setClauses, values };
}

export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput,
): Promise<CustomerWithVirtualAccount | null> {
  const { setClauses, values } = buildCustomerPatch(input);

  if (setClauses.length === 0) {
    return getCustomerById(customerId);
  }

  setClauses.push("updated_at = NOW()");
  values.push(customerId);

  const { rowCount } = await pool.query(
    `UPDATE customers
     SET ${setClauses.join(", ")}
     WHERE id = $${values.length}`,
    values,
  );

  if (!rowCount) {
    return null;
  }

  return getCustomerById(customerId);
}
