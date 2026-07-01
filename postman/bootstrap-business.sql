-- One-time tenant row for manual / Postman testing (no demo seed).
-- Run in TablePlus after migrations, or: npm run db:bootstrap --prefix server
--
-- businessId in Postman env must match this id.

INSERT INTO businesses (id, name, metadata)
VALUES (
  '11111111-1111-1111-1111-111111111101',
  'Ledger-Core Demo Business',
  '{"source":"bootstrap"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
