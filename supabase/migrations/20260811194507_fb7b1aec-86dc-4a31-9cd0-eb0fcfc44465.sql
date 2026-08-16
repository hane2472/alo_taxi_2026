CREATE TABLE public.commission_settlements (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.accounting_periods(id) on delete cascade,
  captain_id uuid not null references public.captains(id) on delete cascade,
  is_paid boolean not null default false,
  paid_at timestamptz,
  paid_by uuid,
  amount numeric(12,2),
  note text,
  created_at timestamptz not null default now(),
  unique (period_id, captain_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_settlements TO authenticated;
GRANT ALL ON public.commission_settlements TO service_role;

ALTER TABLE public.commission_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements_admin_all" ON public.commission_settlements
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_set_commission_paid(
  p_captain uuid,
  p_paid boolean,
  p_amount numeric default null,
  p_period uuid default null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_period := coalesce(p_period, (SELECT id FROM public.accounting_periods WHERE status = 'open' LIMIT 1));
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'no open period';
  END IF;

  INSERT INTO public.commission_settlements (period_id, captain_id, is_paid, paid_at, paid_by, amount)
  VALUES (v_period, p_captain, p_paid, CASE WHEN p_paid THEN now() ELSE NULL END, auth.uid(), p_amount)
  ON CONFLICT (period_id, captain_id) DO UPDATE
    SET is_paid = excluded.is_paid,
        paid_at = excluded.paid_at,
        paid_by = excluded.paid_by,
        amount = coalesce(excluded.amount, public.commission_settlements.amount);

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (auth.uid(),
          CASE WHEN p_paid THEN 'commission_paid' ELSE 'commission_unpaid' END,
          'captain', p_captain,
          jsonb_build_object('period_id', v_period, 'amount', p_amount, 'is_paid', p_paid));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_commission_paid(uuid, boolean, numeric, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_commission_paid(uuid, boolean, numeric, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_settlements(p_period uuid default null)
RETURNS TABLE (captain_id uuid, is_paid boolean, paid_at timestamptz, amount numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.captain_id, s.is_paid, s.paid_at, s.amount
  FROM public.commission_settlements s
  WHERE public.is_admin()
    AND s.period_id = coalesce(p_period, (SELECT id FROM public.accounting_periods WHERE status = 'open' LIMIT 1));
$$;

REVOKE EXECUTE ON FUNCTION public.admin_settlements(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_settlements(uuid) TO authenticated;