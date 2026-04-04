-- Migration 75: Fix POS Loyalty Trigger
-- Prevents database crashes when completing guest/POS orders that don't have a linked user_id.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_order_completion_loyalty()
RETURNS TRIGGER AS $$
DECLARE
    v_loyalty_rate NUMERIC;
    v_coins_to_award INTEGER;
    v_rate_text TEXT;
BEGIN
    -- Only trigger when status moves to 'completed'
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        
        -- IMPORTANT: Only proceed if there is a linked user profile.
        -- Guest/POS orders have NULL user_id and should skip coin awards.
        IF NEW.user_id IS NOT NULL THEN
            
            -- Get the current loyalty rate from settings
            SELECT value::text INTO v_rate_text 
            FROM public.app_settings 
            WHERE key = 'loyalty_rate';
            
            -- Remove quotes if present (JSONB stores strings with quotes)
            v_rate_text := TRIM(BOTH '"' FROM v_rate_text);
            v_loyalty_rate := v_rate_text::NUMERIC;
            
            IF v_loyalty_rate IS NULL OR v_loyalty_rate <= 0 THEN 
                v_loyalty_rate := 0.05; 
            END IF;

            -- Calculate coins (rounding down)
            v_coins_to_award := FLOOR(NEW.total_price * v_loyalty_rate);

            IF v_coins_to_award > 0 THEN
                -- 1. Update the order record
                UPDATE public.orders SET coins_earned = v_coins_to_award WHERE id = NEW.id;

                -- 2. Record the transaction (Fails if user_id is NULL)
                INSERT INTO public.coin_transactions (user_id, amount, type, description, order_id)
                VALUES (NEW.user_id, v_coins_to_award, 'earn', 'Order completion reward', NEW.id);

                -- 3. Update the user's profile balance (Fails if user_id is NULL)
                UPDATE public.profiles SET coins = coins + v_coins_to_award WHERE id = NEW.user_id;
            END IF;
            
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
