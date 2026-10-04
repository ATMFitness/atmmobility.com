-- Activate the campaign used by stretch-reset.html and the v19 Worker.
-- Safe to re-run: updates this campaign record without changing other campaigns.
INSERT INTO campaigns (
  id,
  name,
  source,
  voucher_prefix,
  voucher_value_cents,
  voucher_expiry_days,
  noterro_url,
  is_active
)
VALUES (
  'nankind_small_world_2026',
  'Nankind - It''s a Small World After All',
  'nankind_event',
  'NANKIND',
  2000,
  60,
  'https://atmmobility.noterro.com',
  1
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  source = excluded.source,
  voucher_prefix = excluded.voucher_prefix,
  voucher_value_cents = excluded.voucher_value_cents,
  voucher_expiry_days = excluded.voucher_expiry_days,
  noterro_url = excluded.noterro_url,
  is_active = excluded.is_active;
