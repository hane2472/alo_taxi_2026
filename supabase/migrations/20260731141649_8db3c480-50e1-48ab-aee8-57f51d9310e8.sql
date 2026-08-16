
create or replace function public.touch_last_login()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set last_login_at = now() where id = auth.uid();
  perform public.log_action('login','profile',auth.uid(),null,null);
end; $$;

create or replace function public.my_order_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.orders
  where user_id = auth.uid() and deleted_at is null and period_id = public.current_period_id()
$$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p uuid; res jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  p := public.current_period_id();
  select jsonb_build_object(
    'period', (select to_jsonb(ap) from public.accounting_periods ap where ap.id = p),
    'orders_count', (select count(*) from public.orders where period_id=p and deleted_at is null),
    'total_amount', (select coalesce(sum(amount),0) from public.orders where period_id=p and deleted_at is null),
    'total_commission', (select coalesce(sum(commission_amount),0) from public.orders where period_id=p and deleted_at is null),
    'avg_amount', (select coalesce(round(avg(amount),2),0) from public.orders where period_id=p and deleted_at is null),
    'avg_commission', (select coalesce(round(avg(commission_amount),2),0) from public.orders where period_id=p and deleted_at is null),
    'active_captains', (select count(*) from public.captains where is_active),
    'active_users', (select count(*) from public.profiles where is_active),
    'recent_orders', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select o.order_number, o.order_date, o.amount, o.commission_amount, o.created_at,
               c.name as captain_name, pr.full_name as user_name
        from public.orders o join public.captains c on c.id=o.captain_id
        left join public.profiles pr on pr.id=o.user_id
        where o.period_id=p and o.deleted_at is null order by o.created_at desc limit 8) x),
    'top_captains', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select c.name, count(*) as orders_count, sum(o.amount) as total_amount, sum(o.commission_amount) as total_commission
        from public.orders o join public.captains c on c.id=o.captain_id
        where o.period_id=p and o.deleted_at is null group by c.name order by count(*) desc limit 5) x),
    'per_user', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select pr.full_name as name, count(*) as orders_count
        from public.orders o left join public.profiles pr on pr.id=o.user_id
        where o.period_id=p and o.deleted_at is null group by pr.full_name order by count(*) desc) x),
    'recent_changes', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select o.order_number, o.status::text, o.updated_at, o.deletion_reason, pr.full_name as user_name
        from public.orders o left join public.profiles pr on pr.id=o.user_id
        where o.period_id=p and (o.status in ('edited','deleted'))
        order by o.updated_at desc limit 8) x)
  ) into res;
  return res;
end; $$;

create or replace function public.admin_orders(
  p_search text default null, p_user uuid default null, p_captain uuid default null,
  p_from date default null, p_to date default null, p_min numeric default null, p_max numeric default null,
  p_min_comm numeric default null, p_max_comm numeric default null,
  p_status text default null, p_period uuid default null, p_deleted boolean default false,
  p_sort text default 'newest', p_limit int default 25, p_offset int default 0)
returns table (
  id uuid, order_number text, order_date date, amount numeric, commission_percentage_snapshot numeric,
  commission_amount numeric, status text, created_at timestamptz, updated_at timestamptz,
  deleted_at timestamptz, deletion_reason text, captain_id uuid, captain_name text,
  user_id uuid, user_name text, period_name text, total_count bigint)
language plpgsql stable security definer set search_path = public as $$
declare pid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  pid := coalesce(p_period, public.current_period_id());
  return query
  with base as (
    select o.*, c.name as captain_name, pr.full_name as user_name, ap.name as period_name
    from public.orders o
    join public.captains c on c.id = o.captain_id
    left join public.profiles pr on pr.id = o.user_id
    join public.accounting_periods ap on ap.id = o.period_id
    where o.period_id = pid
      and (case when p_deleted then o.deleted_at is not null else o.deleted_at is null end)
      and (p_user is null or o.user_id = p_user)
      and (p_captain is null or o.captain_id = p_captain)
      and (p_from is null or o.order_date >= p_from)
      and (p_to is null or o.order_date <= p_to)
      and (p_min is null or o.amount >= p_min)
      and (p_max is null or o.amount <= p_max)
      and (p_min_comm is null or o.commission_amount >= p_min_comm)
      and (p_max_comm is null or o.commission_amount <= p_max_comm)
      and (p_status is null or o.status::text = p_status)
      and (p_search is null or p_search = '' or o.order_number ilike '%'||p_search||'%'
           or c.name ilike '%'||p_search||'%' or pr.full_name ilike '%'||p_search||'%')
  ), counted as (select count(*) as n from base)
  select b.id, b.order_number, b.order_date, b.amount, b.commission_percentage_snapshot,
         b.commission_amount, b.status::text, b.created_at, b.updated_at, b.deleted_at, b.deletion_reason,
         b.captain_id, b.captain_name, b.user_id, b.user_name, b.period_name, counted.n
  from base b, counted
  order by
    case when p_sort='oldest' then b.created_at end asc,
    case when p_sort='amount_desc' then b.amount end desc,
    case when p_sort='amount_asc' then b.amount end asc,
    case when p_sort='comm_desc' then b.commission_amount end desc,
    case when p_sort='comm_asc' then b.commission_amount end asc,
    case when p_sort not in ('oldest','amount_desc','amount_asc','comm_desc','comm_asc') then b.created_at end desc
  limit p_limit offset p_offset;
end; $$;

create or replace function public.admin_captains(
  p_search text default null, p_active boolean default null, p_sort text default 'name', p_period uuid default null)
returns table (id uuid, name text, phone text, vehicle_number text, pct numeric, is_active boolean,
  created_at timestamptz, orders_count bigint, total_amount numeric, total_commission numeric)
language plpgsql stable security definer set search_path = public as $$
declare pid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  pid := coalesce(p_period, public.current_period_id());
  return query
  select c.id, c.name, c.phone, c.vehicle_number, c.current_commission_percentage, c.is_active, c.created_at,
    coalesce(s.cnt,0), coalesce(s.amt,0), coalesce(s.comm,0)
  from public.captains c
  left join (
    select captain_id, count(*) cnt, sum(amount) amt, sum(commission_amount) comm
    from public.orders where period_id = pid and deleted_at is null group by captain_id
  ) s on s.captain_id = c.id
  where (p_active is null or c.is_active = p_active)
    and (p_search is null or p_search = '' or c.name ilike '%'||p_search||'%'
         or coalesce(c.phone,'') ilike '%'||p_search||'%' or coalesce(c.vehicle_number,'') ilike '%'||p_search||'%')
  order by
    case when p_sort='orders' then coalesce(s.cnt,0) end desc,
    case when p_sort='commission' then coalesce(s.comm,0) end desc,
    case when p_sort='pct' then c.current_commission_percentage end desc,
    case when p_sort not in ('orders','commission','pct') then 0 end, c.name;
end; $$;

create or replace function public.admin_save_captain(
  p_id uuid, p_name text, p_phone text, p_vehicle text, p_pct numeric, p_active boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; old_row jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_id is null then
    insert into public.captains (name, phone, vehicle_number, current_commission_percentage, is_active)
    values (p_name, p_phone, p_vehicle, p_pct, coalesce(p_active,true)) returning id into v_id;
    perform public.log_action('captain_created','captain',v_id,null,jsonb_build_object('name',p_name,'pct',p_pct));
  else
    select to_jsonb(c) into old_row from public.captains c where c.id = p_id;
    update public.captains set name=p_name, phone=p_phone, vehicle_number=p_vehicle,
      current_commission_percentage=p_pct, is_active=coalesce(p_active,true) where id=p_id;
    v_id := p_id;
    perform public.log_action('captain_updated','captain',v_id,old_row,jsonb_build_object('name',p_name,'pct',p_pct,'is_active',p_active));
  end if;
  return v_id;
end; $$;

create or replace function public.admin_users(p_period uuid default null)
returns table (id uuid, full_name text, email text, is_active boolean, created_at timestamptz,
  last_login_at timestamptz, role text, orders_count bigint)
language plpgsql stable security definer set search_path = public as $$
declare pid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  pid := coalesce(p_period, public.current_period_id());
  return query
  select pr.id, pr.full_name, pr.email, pr.is_active, pr.created_at, pr.last_login_at,
    coalesce((select r.role::text from public.user_roles r where r.user_id=pr.id order by r.role limit 1),'user'),
    coalesce((select count(*) from public.orders o where o.user_id=pr.id and o.period_id=pid and o.deleted_at is null),0)
  from public.profiles pr order by pr.created_at;
end; $$;

create or replace function public.admin_set_user_active(p_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set is_active = p_active where id = p_id;
  perform public.log_action(case when p_active then 'user_enabled' else 'user_disabled' end,'profile',p_id,null,null);
end; $$;

create or replace function public.admin_close_period(p_note text, p_new_name text, p_new_start date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare cur uuid; nid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  cur := public.current_period_id();
  if cur is null then raise exception 'no open period'; end if;
  update public.accounting_periods
    set status='archived', archived_at=now(), archived_by=auth.uid(), closing_note=p_note,
        end_date = coalesce(end_date, current_date)
    where id = cur;
  update public.orders set status='archived' where period_id = cur and deleted_at is null;
  insert into public.accounting_periods (name, start_date, status)
    values (coalesce(nullif(p_new_name,''),'عمولات ' || to_char(current_date,'MM/YYYY')),
            coalesce(p_new_start, current_date), 'open')
    returning id into nid;
  perform public.log_action('period_archived','period',cur,null,jsonb_build_object('note',p_note));
  perform public.log_action('period_created','period',nid,null,jsonb_build_object('name',p_new_name));
  return nid;
end; $$;

create or replace function public.admin_update_period(p_id uuid, p_name text, p_start date, p_end date, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.accounting_periods set name=p_name, start_date=p_start, end_date=p_end, closing_note=coalesce(p_note, closing_note)
  where id=p_id and status='open';
end; $$;

create or replace function public.admin_periods()
returns table (id uuid, name text, start_date date, end_date date, status text, archived_at timestamptz,
  archived_by_name text, closing_note text, orders_count bigint, total_amount numeric, total_commission numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select ap.id, ap.name, ap.start_date, ap.end_date, ap.status::text, ap.archived_at,
    (select pr.full_name from public.profiles pr where pr.id = ap.archived_by), ap.closing_note,
    coalesce(s.cnt,0), coalesce(s.amt,0), coalesce(s.comm,0)
  from public.accounting_periods ap
  left join (select period_id, count(*) cnt, sum(amount) amt, sum(commission_amount) comm
             from public.orders where deleted_at is null group by period_id) s on s.period_id = ap.id
  order by ap.created_at desc;
end; $$;

create or replace function public.admin_period_report(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'period', (select to_jsonb(ap) from public.accounting_periods ap where ap.id=p_id),
    'orders_count', (select count(*) from public.orders where period_id=p_id and deleted_at is null),
    'total_amount', (select coalesce(sum(amount),0) from public.orders where period_id=p_id and deleted_at is null),
    'total_commission', (select coalesce(sum(commission_amount),0) from public.orders where period_id=p_id and deleted_at is null),
    'deleted_count', (select count(*) from public.orders where period_id=p_id and deleted_at is not null),
    'edited_count', (select count(*) from public.orders where period_id=p_id and status='edited'),
    'captains', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
       select c.name, c.phone, count(*) orders_count, sum(o.amount) total_amount,
              sum(o.commission_amount) total_commission
       from public.orders o join public.captains c on c.id=o.captain_id
       where o.period_id=p_id and o.deleted_at is null group by c.name, c.phone order by sum(o.commission_amount) desc) x),
    'users', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
       select pr.full_name as name, count(*) orders_count, sum(o.amount) total_amount
       from public.orders o left join public.profiles pr on pr.id=o.user_id
       where o.period_id=p_id and o.deleted_at is null group by pr.full_name order by count(*) desc) x)
  ) into res;
  return res;
end; $$;

create or replace function public.admin_audit(p_action text default null, p_limit int default 50, p_offset int default 0)
returns table (id uuid, action text, entity_type text, entity_id uuid, old_data jsonb, new_data jsonb,
  created_at timestamptz, user_name text, total_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with base as (
    select a.*, pr.full_name as user_name from public.audit_logs a
    left join public.profiles pr on pr.id = a.user_id
    where (p_action is null or p_action='' or a.action = p_action)
  ), c as (select count(*) n from base)
  select b.id, b.action, b.entity_type, b.entity_id, b.old_data, b.new_data, b.created_at, b.user_name, c.n
  from base b, c order by b.created_at desc limit p_limit offset p_offset;
end; $$;

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
