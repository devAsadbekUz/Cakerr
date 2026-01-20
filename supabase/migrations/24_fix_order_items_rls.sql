-- Allow staff (admins and bakers) to view all order items
-- This is necessary so the Admin Dashboard can show what products are in each order.

DROP POLICY IF EXISTS "Admins/Bakers can view all order items" ON order_items;

CREATE POLICY "Admins/Bakers can view all order items" ON order_items
  FOR SELECT USING (is_staff());
