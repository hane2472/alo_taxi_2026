CREATE OR REPLACE FUNCTION public.admin_delete_captain(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare n int; nm text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select name into nm from public.captains where id = p_id;
  if nm is null then raise exception 'الكابتن غير موجود'; end if;
  select count(*) into n from public.orders where captain_id = p_id;
  delete from public.commission_settlements where captain_id = p_id;
  delete from public.orders where captain_id = p_id;
  delete from public.captains where id = p_id;
  perform public.log_action('captain_deleted','captain',p_id,jsonb_build_object('name',nm,'orders_deleted',n),null);
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_period(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare n int; nm text; st period_status;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select name, status into nm, st from public.accounting_periods where id = p_id;
  if nm is null then raise exception 'الدورة غير موجودة'; end if;
  if st = 'open' then raise exception 'لا يمكن حذف الدورة المفتوحة'; end if;
  select count(*) into n from public.orders where period_id = p_id;
  delete from public.commission_settlements where period_id = p_id;
  delete from public.orders where period_id = p_id;
  delete from public.accounting_periods where id = p_id;
  perform public.log_action('period_deleted','period',p_id,jsonb_build_object('name',nm,'orders_deleted',n),null);
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user_data(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.orders where user_id = p_id;
end;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_period(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_delete_user_data(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_period(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_data(uuid) TO authenticated;