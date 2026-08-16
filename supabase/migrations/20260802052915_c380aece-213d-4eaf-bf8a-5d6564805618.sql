ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_location text,
  ADD COLUMN IF NOT EXISTS destination text;

GRANT SELECT, INSERT, UPDATE (pickup_location, destination) ON public.orders TO authenticated;

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_admin() OR (user_id = auth.uid() AND period_id = public.current_period_id()));