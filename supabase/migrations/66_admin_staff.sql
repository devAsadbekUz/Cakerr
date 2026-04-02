-- admin_staff: stores the single kitchen staff account the owner can create.
-- Only one row is allowed (enforced at application level).
-- Accessed exclusively via service role key — no RLS policies needed.

CREATE TABLE IF NOT EXISTS admin_staff (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    username    text        NOT NULL UNIQUE,
    password_hash text      NOT NULL,
    permissions text[]      NOT NULL DEFAULT '{}',
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE admin_staff ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies: only the service role can access this table.
