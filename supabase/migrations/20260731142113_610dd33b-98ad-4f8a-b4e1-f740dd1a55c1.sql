
alter table public.orders alter column user_id set default auth.uid();
alter table public.orders alter column period_id set default public.current_period_id();
