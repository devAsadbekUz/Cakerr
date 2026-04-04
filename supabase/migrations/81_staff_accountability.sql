-- 81_staff_accountability.sql
-- This migration adds a 'conveyor' column to the orders table.
-- Why? Because most admin updates use a Service Role client that doesn't have auth.uid().
-- By passing the name explicitly to this column, the trigger can capture the human author
-- before they are logged into the permanent 'order_logs' table.

-- Add a conveyor column to capture the identity of the person updating the order
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_updated_by_name TEXT;

-- Update the status logging logic to prioritize this column
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    current_user_name TEXT;
BEGIN
    -- Only log if status has changed
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN
        
        -- Priority 1: Use the explicit name passed from the application
        IF NEW.last_updated_by_name IS NOT NULL THEN
            current_user_name := NEW.last_updated_by_name;
        
        -- Priority 2: Use auth.uid() lookup if available (for owner/profiles)
        ELSIF auth.uid() IS NOT NULL THEN
            SELECT full_name INTO current_user_name 
            FROM public.profiles 
            WHERE id = auth.uid();
        END IF;

        -- Fallback to 'System' or 'Telegram' if no auth context
        IF current_user_name IS NULL THEN
            current_user_name := 'System';
        END IF;

        INSERT INTO public.order_logs (
            order_id,
            old_status,
            new_status,
            changed_by_id,
            changed_by_name,
            created_at
        ) VALUES (
            NEW.id,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
            NEW.status,
            auth.uid(),
            current_user_name,
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
