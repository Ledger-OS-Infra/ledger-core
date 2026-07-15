import { Router } from "express";
import PDFDocument from "pdfkit";

import { getBusinessById } from "../db/businesses";
import { findCustomerByAccountNumber, getCustomerById } from "../db/customers";
import {
  getCustomerBalance,
  listCustomerLedgerHistory,
  listCustomerOutstandingObligations,
  type CustomerLedgerHistoryRow,
} from "../db/reporting";
import {
    portalLookupBody,
    portalLoginBody,
    portalForgotPasswordBody,
    portalResetPasswordBody,
  } from "../lib/schemas/portal";
  import {
    portalLookupRateLimit,
    portalLoginRateLimit,
    portalForgotPasswordRateLimit,
    portalResetPasswordRateLimit,
  } from "../middleware/rateLimit";
  import * as customerAuthService from "../services/customerAuth";
import { AppError } from "../lib/AppError";
import { koboToNgn } from "../lib/money";
import { requirePortalAuth } from "../middleware/requirePortalAuth";
import { validate } from "../middleware/validate";
import { signPortalToken } from "../services/portalAuth";
import { env } from "../config/env";

export const portalRouter = Router();

// ── helpers ──────────────────────────────────────────────────────────

function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function toPortalStatus(status: string): "paid" | "partial" | "unpaid" {
  if (status === "PAID") return "paid";
  if (status === "PARTIAL") return "partial";
  return "unpaid"; // covers UNPAID and OVERDUE
}

/**
 * ASSUMPTION: DEBIT entries represent an obligation being created/increased;
 * every other entry_type (CREDIT, PAYMENT_APPLIED, PARTIAL_PAYMENT,
 * OVERPAYMENT_CREDIT, WALLET_APPLIED) represents money moving in. Adjust
 * this mapping if that's not how your ledger semantics work.
 */
function toPortalLedgerKind(entryType: string): "payment" | "obligation" {
  return entryType === "DEBIT" ? "obligation" : "payment";
}

function toPortalLedgerEntry(row: CustomerLedgerHistoryRow) {
  return {
    id: row.ledger_entry_id,
    date: row.created_at.toISOString().slice(0, 10),
    kind: toPortalLedgerKind(row.entry_type),
    description: row.description,
    amount: koboToNgn(Number(row.amount)),
    applied_to: row.obligation_reference_code,
  };
}

/** Walks every page of the customer's ledger — used for history + PDF, where truncating to one page would be wrong. */
async function fetchAllLedgerEntries(
  customerId: string,
): Promise<CustomerLedgerHistoryRow[]> {
  const pageSize = 100;
  const first = await listCustomerLedgerHistory(customerId, {
    page: 1,
    limit: pageSize,
  });

  const entries = [...first.items];
  for (let page = 2; page <= first.pagination.total_pages; page += 1) {
    const next = await listCustomerLedgerHistory(customerId, {
      page,
      limit: pageSize,
    });
    entries.push(...next.items);
  }

  return entries;
}

// ── POST /portal/login — email + password ────────────────────────────

portalRouter.post(
    "/login",
    portalLoginRateLimit,
    validate({ body: portalLoginBody }),
    async (req, res, next) => {
      try {
        const { email, password } = req.body as { email: string; password: string };
        const result = await customerAuthService.customerLogin({ email, password });
        res.json({ data: result });
      } catch (err) {
        next(err);
      }
    },
  );
  
  // ── POST /portal/forgot-password ──────────────────────────────────────
  
  portalRouter.post(
    "/forgot-password",
    portalForgotPasswordRateLimit,
    validate({ body: portalForgotPasswordBody }),
    async (req, res, next) => {
      try {
        const { email } = req.body as { email: string };
        const result = await customerAuthService.customerForgotPassword(email);
        res.json({ data: result });
      } catch (err) {
        next(err);
      }
    },
  );
  
  // ── POST /portal/reset-password ───────────────────────────────────────
  
  portalRouter.post(
    "/reset-password",
    portalResetPasswordRateLimit,
    validate({ body: portalResetPasswordBody }),
    async (req, res, next) => {
      try {
        const { token, password } = req.body as { token: string; password: string };
        const result = await customerAuthService.customerResetPassword({ token, password });
        res.json({ data: result });
      } catch (err) {
        next(err);
      }
    },
  );



// ── GET /portal/account — requires portal session token ─────────────

portalRouter.get("/account", requirePortalAuth, async (req, res, next) => {
  try {
    const customerId = req.portalUser!.sub;

    const [balance, customer] = await Promise.all([
      getCustomerBalance(customerId),
      getCustomerById(customerId),
    ]);

    if (!balance || !customer) {
      throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
    }

    const business = await getBusinessById(customer.business_id);
    if (!business) {
      throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
    }

    const obligationsResult = await listCustomerOutstandingObligations(
      customerId,
      { page: 1, limit: 100 },
    );

    const obligations = obligationsResult.items
      .filter((row) => row.status !== "PAID")
      .map((row) => ({
        id: row.obligation_id,
        name: row.reference_code ?? row.obligation_type,
        amount: koboToNgn(Number(row.amount)),
        remaining: koboToNgn(Number(row.outstanding)),
        status: toPortalStatus(row.status),
        due_date: row.due_date,
      }));

    const ledgerResult = await listCustomerLedgerHistory(customerId, {
      page: 1,
      limit: 4,
    });

    res.json({
      data: {
        business: { name: business.name },
        customer: {
          id: customer.id,
          name: customer.full_name,
          virtual_account: customer.virtual_account.account_number,
          initials: initialsFromName(customer.full_name),
        },
        balance: {
          outstanding: koboToNgn(Number(balance.total_outstanding)),
          wallet_credit: koboToNgn(Number(balance.wallet_credit)),
        },
        obligations,
        recent_ledger: ledgerResult.items.map(toPortalLedgerEntry),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /portal/history — full ledger, requires portal session token ─

portalRouter.get("/history", requirePortalAuth, async (req, res, next) => {
  try {
    const customerId = req.portalUser!.sub;
    const entries = await fetchAllLedgerEntries(customerId);

    res.json({
      data: { entries: entries.map(toPortalLedgerEntry) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /portal/statement.pdf — server-generated PDF statement ──────

portalRouter.get("/statement.pdf", requirePortalAuth, async (req, res, next) => {
  try {
    const customerId = req.portalUser!.sub;

    const customer = await getCustomerById(customerId);
    if (!customer) {
      throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
    }

    const [business, entries] = await Promise.all([
      getBusinessById(customer.business_id),
      fetchAllLedgerEntries(customerId),
    ]);

    const filename = `statement-${customer.virtual_account.account_number}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: "A4", margin: 48 });
    doc.pipe(res);

    doc.font("Helvetica-Bold").fontSize(18).fillColor("#000").text("Payment statement");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(11).fillColor("#555");
    doc.text(business?.name ?? "");
    doc.text(`${customer.full_name} \u00B7 Account ${customer.virtual_account.account_number}`);
    doc.text(`Generated ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown();

    doc.strokeColor("#ddd").moveTo(48, doc.y).lineTo(548, doc.y).stroke();
    doc.moveDown();
    doc.fillColor("#000");

    for (const row of entries) {
      const kind = toPortalLedgerKind(row.entry_type);
      const isPayment = kind === "payment";
      const amount = koboToNgn(Number(row.amount));
      const date = row.created_at.toISOString().slice(0, 10);
      const y = doc.y;

      // NOTE: PDFKit's built-in Helvetica font only supports WinAnsi
      // encoding, which doesn't include the ₦ glyph — using "NGN" here to
      // avoid a broken/missing character. To get the real ₦ symbol, embed
      // a Unicode font (e.g. Noto Sans) via doc.registerFont()/doc.font().
      const amountLabel = `${isPayment ? "+" : ""}NGN ${amount.toLocaleString("en-NG")}`;

      doc.fontSize(10).fillColor("#000");
      doc.text(date, 48, y, { width: 80, lineBreak: false });
      doc.text(row.description, 138, y, { width: 260, lineBreak: false });
      doc.text(amountLabel, 408, y, {
        width: 140,
        align: "right",
        lineBreak: false,
      });

      doc.y = y + 14;

      if (row.obligation_reference_code) {
        doc.fontSize(9).fillColor("#888");
        doc.text(row.obligation_reference_code, 138, doc.y, {
          width: 260,
          lineBreak: false,
        });
        doc.y += 12;
        doc.fillColor("#000");
      }

      doc.moveDown(0.5);

      if (doc.y > 760) {
        doc.addPage();
      }
    }

    doc.end();
  } catch (err) {
    next(err);
  }
});