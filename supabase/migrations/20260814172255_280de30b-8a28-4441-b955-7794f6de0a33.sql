CREATE TABLE public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid references public.captains(id) on delete set null,
  captain_name text not null default '',
  period_id uuid references public.accounting_periods(id) on delete set null,
  period_name text not null default '',
  phone text,
  orders_count integer not null default 0,
  commission_amount numeric not null default 0,
  status text not null default 'failed',
  error_message text,
  message_id text,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.whatsapp_logs TO authenticated;
GRANT ALL ON public.whatsapp_logs TO service_role;

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_logs_admin_select ON public.whatsapp_logs
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE INDEX whatsapp_logs_created_idx ON public.whatsapp_logs (created_at DESC);