import type { Knex } from "knex";
import { ngnToKobo } from "../../lib/money";

/** Stable IDs so dev seed is reproducible across environments. */
const IDS = {
  business: "11111111-1111-1111-1111-111111111101",
  john: "11111111-1111-1111-1111-111111111201",
  johnVa: "11111111-1111-1111-1111-111111111301",
  johnInvoice: "11111111-1111-1111-1111-111111111401",
  johnPay1: "11111111-1111-1111-1111-111111111501",
  johnPay2: "11111111-1111-1111-1111-111111111502",
  johnWallet: "11111111-1111-1111-1111-111111111601",
  raphael: "11111111-1111-1111-1111-111111111202",
  raphaelVa: "11111111-1111-1111-1111-111111111302",
  raphaelBillingRule: "11111111-1111-1111-1111-111111111402",
  raphaelJuneObligation: "11111111-1111-1111-1111-111111111403",
  raphaelJulyObligation: "11111111-1111-1111-1111-111111111404",
  raphaelPay1: "11111111-1111-1111-1111-111111111503",
  raphaelPay2: "11111111-1111-1111-1111-111111111504",
  raphaelWallet: "11111111-1111-1111-1111-111111111602",
} as const;

/**
 * Optional legacy demo seed — reproduces TASK.md §6 John/Raphael scenarios.
 *
 * NOT used in the default setup. Create test data via Postman instead
 * (see postman/README.md). Run manually only if needed:
 *   npm run seed --prefix server
 *
 * - John Doe: invoice partial then overpayment (₦20,000 wallet credit)
 * - Raphael: DSTV-style monthly MBU with partial June + FIFO clearance in July
 *
 * All monetary amounts are stored in kobo (1 NGN = 100 kobo), matching Nomba webhooks.
 * Use ngnToKobo() so TASK.md naira figures stay readable in seed code.
 */
export async function seed(knex: Knex): Promise<void> {
  await knex.raw(`
    TRUNCATE TABLE
      ledger_entries,
      payment_events,
      customer_wallets,
      payment_obligations,
      billing_rules,
      virtual_accounts,
      customers,
      businesses
    RESTART IDENTITY CASCADE
  `);

  await knex("businesses").insert({
    id: IDS.business,
    name: "Ledger-Core Demo Business",
    metadata: JSON.stringify({ industry: "mixed", source: "dev-seed" }),
  });

  await knex("customers").insert([
    {
      id: IDS.john,
      business_id: IDS.business,
      full_name: "John Doe",
      email: "john.doe@example.com",
      phone: "+2348010000001",
      status: "ACTIVE",
      metadata: JSON.stringify({ scenario: "invoice" }),
    },
    {
      id: IDS.raphael,
      business_id: IDS.business,
      full_name: "Raphael Okonkwo",
      email: "raphael.okonkwo@example.com",
      phone: "+2348010000002",
      status: "ACTIVE",
      metadata: JSON.stringify({ scenario: "subscription-dstv" }),
    },
  ]);

  await knex("virtual_accounts").insert([
    {
      id: IDS.johnVa,
      customer_id: IDS.john,
      nomba_account_ref: "seed_john_doe",
      account_number: "8112340001",
      bank_name: "Nomba MFB",
      bank_code: "090645",
      is_active: true,
    },
    {
      id: IDS.raphaelVa,
      customer_id: IDS.raphael,
      nomba_account_ref: "seed_raphael_okonkwo",
      account_number: "8112340002",
      bank_name: "Nomba MFB",
      bank_code: "090645",
      is_active: true,
    },
  ]);

  // --- Invoice scenario (John): ₦150,000 invoice, ₦70k partial, ₦100k clears + ₦20k credit ---
  await knex("payment_obligations").insert({
    id: IDS.johnInvoice,
    business_id: IDS.business,
    customer_id: IDS.john,
    obligation_type: "INVOICE",
    reference_code: "INV-2026-001",
    amount: ngnToKobo(150_000),
    amount_paid: ngnToKobo(150_000),
    due_date: "2026-05-15",
    status: "PAID",
    metadata: JSON.stringify({
      description: "Project milestone invoice",
      scenario_step: "final",
    }),
  });

  await knex("payment_events").insert([
    {
      id: IDS.johnPay1,
      business_id: IDS.business,
      virtual_account_id: IDS.johnVa,
      idempotency_key: "seed-john-pay-70000",
      amount: ngnToKobo(70_000),
      sender_name: "John Doe",
      sender_account: "0123456789",
      raw_payload: JSON.stringify({ scenario: "invoice-partial" }),
      received_at: "2026-05-20T10:00:00Z",
    },
    {
      id: IDS.johnPay2,
      business_id: IDS.business,
      virtual_account_id: IDS.johnVa,
      idempotency_key: "seed-john-pay-100000",
      amount: ngnToKobo(100_000),
      sender_name: "John Doe",
      sender_account: "0123456789",
      raw_payload: JSON.stringify({ scenario: "invoice-overpayment" }),
      received_at: "2026-06-01T14:30:00Z",
    },
  ]);

  await knex("ledger_entries").insert([
    {
      customer_id: IDS.john,
      obligation_id: IDS.johnInvoice,
      payment_event_id: IDS.johnPay1,
      entry_type: "CREDIT",
      amount: ngnToKobo(70_000),
      balance_after: ngnToKobo(80_000),
      description: "Partial payment applied to INV-2026-001",
      created_at: "2026-05-20T10:00:01Z",
    },
    {
      customer_id: IDS.john,
      obligation_id: IDS.johnInvoice,
      payment_event_id: IDS.johnPay2,
      entry_type: "CREDIT",
      amount: ngnToKobo(80_000),
      balance_after: 0,
      description: "Final payment clears INV-2026-001",
      created_at: "2026-06-01T14:30:01Z",
    },
    {
      customer_id: IDS.john,
      obligation_id: null,
      payment_event_id: IDS.johnPay2,
      entry_type: "CREDIT",
      amount: ngnToKobo(20_000),
      balance_after: ngnToKobo(20_000),
      description: "Overpayment credited to customer wallet",
      created_at: "2026-06-01T14:30:02Z",
    },
  ]);

  await knex("customer_wallets").insert({
    id: IDS.johnWallet,
    customer_id: IDS.john,
    balance: ngnToKobo(20_000),
    updated_at: "2026-06-01T14:30:02Z",
  });

  // --- Subscription scenario (Raphael): ₦6,000 monthly MBU, DSTV-style FIFO flow ---
  await knex("billing_rules").insert({
    id: IDS.raphaelBillingRule,
    business_id: IDS.business,
    customer_id: IDS.raphael,
    obligation_type: "SUBSCRIPTION",
    amount: ngnToKobo(6_000),
    recurrence: "MONTHLY",
    day_of_month: 1,
    next_run_date: "2026-08-01",
    is_active: true,
    metadata: JSON.stringify({ product: "DSTV Premium", mbu_label: "Monthly Billing Unit" }),
  });

  await knex("payment_obligations").insert([
    {
      id: IDS.raphaelJuneObligation,
      business_id: IDS.business,
      customer_id: IDS.raphael,
      billing_rule_id: IDS.raphaelBillingRule,
      obligation_type: "SUBSCRIPTION",
      reference_code: "MBU-2026-06",
      amount: ngnToKobo(6_000),
      amount_paid: ngnToKobo(6_000),
      due_date: "2026-06-01",
      status: "PAID",
      metadata: JSON.stringify({ billing_period: "2026-06" }),
    },
    {
      id: IDS.raphaelJulyObligation,
      business_id: IDS.business,
      customer_id: IDS.raphael,
      billing_rule_id: IDS.raphaelBillingRule,
      obligation_type: "SUBSCRIPTION",
      reference_code: "MBU-2026-07",
      amount: ngnToKobo(6_000),
      amount_paid: ngnToKobo(6_000),
      due_date: "2026-07-01",
      status: "PAID",
      metadata: JSON.stringify({ billing_period: "2026-07" }),
    },
  ]);

  await knex("payment_events").insert([
    {
      id: IDS.raphaelPay1,
      business_id: IDS.business,
      virtual_account_id: IDS.raphaelVa,
      idempotency_key: "seed-raphael-pay-4400",
      amount: ngnToKobo(4_400),
      sender_name: "Raphael Okonkwo",
      sender_account: "0987654321",
      raw_payload: JSON.stringify({ scenario: "subscription-partial-june" }),
      received_at: "2026-06-10T09:00:00Z",
    },
    {
      id: IDS.raphaelPay2,
      business_id: IDS.business,
      virtual_account_id: IDS.raphaelVa,
      idempotency_key: "seed-raphael-pay-7600",
      amount: ngnToKobo(7_600),
      sender_name: "Raphael Okonkwo",
      sender_account: "0987654321",
      raw_payload: JSON.stringify({ scenario: "subscription-fifo-clearance" }),
      received_at: "2026-07-05T11:00:00Z",
    },
  ]);

  await knex("ledger_entries").insert([
    {
      customer_id: IDS.raphael,
      obligation_id: IDS.raphaelJuneObligation,
      payment_event_id: IDS.raphaelPay1,
      entry_type: "CREDIT",
      amount: ngnToKobo(4_400),
      balance_after: ngnToKobo(1_600),
      description: "Partial payment applied to MBU-2026-06",
      created_at: "2026-06-10T09:00:01Z",
    },
    {
      customer_id: IDS.raphael,
      obligation_id: IDS.raphaelJuneObligation,
      payment_event_id: IDS.raphaelPay2,
      entry_type: "CREDIT",
      amount: ngnToKobo(1_600),
      balance_after: 0,
      description: "FIFO: clears remaining June MBU balance",
      created_at: "2026-07-05T11:00:01Z",
    },
    {
      customer_id: IDS.raphael,
      obligation_id: IDS.raphaelJulyObligation,
      payment_event_id: IDS.raphaelPay2,
      entry_type: "CREDIT",
      amount: ngnToKobo(6_000),
      balance_after: 0,
      description: "FIFO: clears July MBU in full",
      created_at: "2026-07-05T11:00:02Z",
    },
  ]);

  await knex("customer_wallets").insert({
    id: IDS.raphaelWallet,
    customer_id: IDS.raphael,
    balance: 0,
    updated_at: "2026-07-05T11:00:02Z",
  });
}
