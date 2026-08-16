
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
grant execute on function public.touch_last_login(), public.my_order_count(), public.admin_stats(),
  public.admin_captains(text,boolean,text,uuid), public.admin_save_captain(uuid,text,text,text,numeric,boolean),
  public.admin_users(uuid), public.admin_set_user_active(uuid,boolean),
  public.admin_close_period(text,text,date), public.admin_update_period(uuid,text,date,date,text),
  public.admin_periods(), public.admin_period_report(uuid), public.admin_audit(text,int,int),
  public.admin_orders(text,uuid,uuid,date,date,numeric,numeric,numeric,numeric,text,uuid,boolean,text,int,int),
  public.has_role(uuid,public.app_role), public.is_admin(), public.current_period_id(),
  public.log_action(text,text,uuid,jsonb,jsonb)
to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do nothing;
  select not exists (select 1 from public.user_roles where role='admin') into first_user;
  insert into public.user_roles (user_id, role)
  values (new.id, case when first_user then 'admin'::public.app_role else 'user'::public.app_role end)
  on conflict do nothing;
  return new;
end; $$;
