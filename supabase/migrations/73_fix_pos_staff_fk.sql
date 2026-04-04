-- Fix created_by FK constraint
-- The created_by column can reference either a profile (Owner) or admin_staff (Staff).
-- Since Postgres doesn't support easy polymorphic FKs, we remove the constraint.

BEGIN;

ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_created_by_fkey;

COMMIT;
