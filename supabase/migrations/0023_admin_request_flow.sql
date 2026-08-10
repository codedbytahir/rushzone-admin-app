-- 0023_admin_request_flow.sql
-- Employee/Admin request flow: first-time staff request admin access; the Owner
-- sees pending requests, approves with roles, generates a Super Key and hands it over.
-- Add a requested_role note column so pending requests carry the applicant's role intent.
alter table admin.assignments add column if not exists requested_role text;
