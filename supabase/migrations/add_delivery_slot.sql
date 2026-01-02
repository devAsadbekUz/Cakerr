-- Add delivery_slot column to orders table
ALTER TABLE orders 
ADD COLUMN delivery_slot TEXT;
