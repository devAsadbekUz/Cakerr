-- 71_add_staff_last_login.sql
-- Adds activity tracking to the staff table to support multi-staff monitoring.

ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Ensure the ID column is consistently named if we ever need to join, 
-- but admin_staff is mostly accessed via service and username for login.
