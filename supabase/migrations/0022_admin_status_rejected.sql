-- 0022_admin_status_rejected.sql
-- The owner can reject a pending admin application. Add the 'rejected' value
-- to the admin_status enum so assignments carry the full lifecycle:
-- pending -> active | rejected | suspended | revoked
alter type public.admin_status add value if not exists 'rejected';
