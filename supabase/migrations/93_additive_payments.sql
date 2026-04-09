-- Migration 93: Additive Payment System
-- 
-- Updates the payment logging system to support additive payments
-- instead of just overwriting the total.

BEGIN;

-- 1. Update the event_type check constraint on order_payment_logs
-- We keep 'deposit_edited' for backward compatibility, but will rely on 'payment_added' for new additive entries.
ALTER TABLE public.order_payment_logs DROP CONSTRAINT IF EXISTS order_payment_logs_event_type_check;

ALTER TABLE public.order_payment_logs 
    ADD CONSTRAINT order_payment_logs_event_type_check 
    CHECK (event_type IN (
        'deposit_recorded',
        'deposit_edited',
        'final_payment_recorded',
        'payment_added' -- New additive payment type
    ));

-- 2. Add some comments for clarity
COMMENT ON COLUMN public.orders.deposit_amount IS 'Total sum of all intermediate payments received before order completion.';
COMMENT ON COLUMN public.orders.final_payment_amount IS 'The final sum received when the order was moved to completed status.';

COMMIT;
