-- Migration A (feature 005-order-cancellation-expiration): add the 8th
-- terminal status 'expired' to the order_status enum.
--
-- Isolated in its own migration because PostgreSQL cannot USE a newly added
-- enum value in the same transaction that adds it — the referencing
-- functions/triggers live in 20260925000002_order_cancellation_expiration.sql.

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'expired';
