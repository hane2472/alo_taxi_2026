create or replace function public.admin_delete_captain(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare n int; nm text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select count(*) into n from public.orders where captain_id = p_id;
  if n > 0 then
    raise exception 'لا يمكن حذف كابتن لديه % طلب مسجل، يمكنك تعطيله بدلاً من ذلك', n;
  end if;
  select name into nm from public.captains where id = p_id;
  if nm is null then raise exception 'الكابتن غير موجود'; end if;
  delete from public.captains where id = p_id;
  perform public.log_action('captain_deleted','captain',p_id,jsonb_build_object('name',nm),null);
end; $$;

revoke all on function public.admin_delete_captain(uuid) from public, anon;
grant execute on function public.admin_delete_captain(uuid) to authenticated;

create or replace function public.admin_daily_orders(p_period uuid default null)
returns table(day date, orders_count bigint, total_amount numeric, total_commission numeric)
language plpgsql
stable security definer
set search_path = public
as $$
declare pid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  pid := coalesce(p_period, public.current_period_id());
  return query
  select o.order_date, count(*), coalesce(sum(o.amount),0), coalesce(sum(o.commission_amount),0)
  from public.orders o
  where o.period_id = pid and o.deleted_at is null
  group by o.order_date order by o.order_date;
end; $$;

revoke all on function public.admin_daily_orders(uuid) from public, anon;
grant execute on function public.admin_daily_orders(uuid) to authenticated;