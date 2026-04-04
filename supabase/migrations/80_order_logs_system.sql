-- 80_order_logs_system.sql
-- Create table for tracking order status changes

CREATE TABLE IF NOT EXISTS public.order_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON public.order_logs(order_id);

-- Enable RLS
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins/Bakers can view all logs" ON public.order_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'baker')
        )
    );

-- Function to handle order status change logging
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    current_user_name TEXT;
BEGIN
    -- Only log if status has changed
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN
        
        -- Try to get the name of the person changing it
        -- If it's a dashboard update, we might have auth.uid()
        IF auth.uid() IS NOT NULL THEN
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

-- Trigger for orders table
DROP TRIGGER IF EXISTS tr_order_status_change ON public.orders;
CREATE TRIGGER tr_order_status_change
    AFTER INSERT OR UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_status_change();
