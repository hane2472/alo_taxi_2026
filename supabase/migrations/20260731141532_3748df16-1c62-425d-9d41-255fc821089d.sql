
-- ENUMS
create type public.app_role as enum ('admin','user');
create type public.order_status as enum ('active','edited','deleted','archived');
create type public.period_status as enum ('open','archived');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
$$;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_update_admin" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "roles_select" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- CAPTAINS
create table public.captains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  vehicle_number text,
  current_commission_percentage numeric(5,2) not null default 7,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select (id, name, phone, vehicle_number, is_active, created_at) on public.captains to authenticated;
grant all on public.captains to service_role;
alter table public.captains enable row level security;
create policy "captains_select_active" on public.captains for select to authenticated using (is_active or public.is_admin());

-- PERIODS
create table public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null default current_date,
  end_date date,
  status public.period_status not null default 'open',
  archived_at timestamptz,
  archived_by uuid references auth.users(id),
  closing_note text,
  created_at timestamptz not null default now()
);
create unique index one_open_period on public.accounting_periods (status) where status = 'open';
grant select (id, name, start_date, end_date, status, created_at) on public.accounting_periods to authenticated;
grant all on public.accounting_periods to service_role;
alter table public.accounting_periods enable row level security;
create policy "periods_select" on public.accounting_periods for select to authenticated using (true);

create or replace function public.current_period_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.accounting_periods where status = 'open' order by created_at desc limit 1
$$;

-- ORDERS
create sequence public.order_number_seq start 1000;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default 'AT-' || lpad(nextval('public.order_number_seq')::text, 6, '0'),
  order_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  captain_id uuid not null references public.captains(id),
  user_id uuid not null references auth.users(id),
  period_id uuid not null references public.accounting_periods(id),
  commission_percentage_snapshot numeric(5,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  status public.order_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  deletion_reason text
);
create index orders_order_number_idx on public.orders (order_number);
create index orders_order_date_idx on public.orders (order_date);
create index orders_captain_idx on public.orders (captain_id);
create index orders_user_idx on public.orders (user_id);
create index orders_period_idx on public.orders (period_id);
create index orders_status_idx on public.orders (status);

grant select (id, order_number, order_date, amount, captain_id, user_id, period_id, status, notes, created_at, updated_at, deleted_at, deletion_reason) on public.orders to authenticated;
grant insert (order_date, amount, captain_id, notes) on public.orders to authenticated;
grant update (order_date, amount, captain_id, notes, status, deleted_at, deletion_reason) on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;

create policy "orders_select_own" on public.orders for select to authenticated
  using (public.is_admin() or (user_id = auth.uid() and deleted_at is null and period_id = public.current_period_id()));

create policy "orders_insert_own" on public.orders for insert to authenticated
  with check (user_id = auth.uid() and period_id = public.current_period_id());

create policy "orders_update_own" on public.orders for update to authenticated
  using (public.is_admin() or (user_id = auth.uid() and deleted_at is null and period_id = public.current_period_id()))
  with check (public.is_admin() or (user_id = auth.uid() and period_id = public.current_period_id()));

-- AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

create or replace function public.log_action(_action text, _entity_type text, _entity_id uuid, _old jsonb, _new jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  values (auth.uid(), _action, _entity_type, _entity_id, _old, _new)
$$;
grant execute on function public.log_action(text,text,uuid,jsonb,jsonb) to authenticated;

-- ORDER TRIGGERS: enforce ownership, period, commission snapshot
create or replace function public.orders_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare pct numeric(5,2);
begin
  new.user_id := coalesce(new.user_id, auth.uid());
  if not public.is_admin() then new.user_id := auth.uid(); end if;
  new.period_id := public.current_period_id();
  select current_commission_percentage into pct from public.captains where id = new.captain_id;
  new.commission_percentage_snapshot := coalesce(pct, 0);
  new.commission_amount := round(new.amount * coalesce(pct,0) / 100, 2);
  new.status := 'active';
  new.deleted_at := null;
  return new;
end; $$;
create trigger orders_bi before insert on public.orders for each row execute function public.orders_before_insert();

create or replace function public.orders_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := old.user_id;
  new.period_id := old.period_id;
  new.order_number := old.order_number;
  new.commission_percentage_snapshot := old.commission_percentage_snapshot;
  if new.amount <> old.amount or new.captain_id <> old.captain_id then
    new.commission_amount := round(new.amount * old.commission_percentage_snapshot / 100, 2);
  end if;
  new.updated_at := now();
  if new.deleted_at is not null and old.deleted_at is null then
    new.deleted_by := auth.uid();
    new.status := 'deleted';
  elsif new.deleted_at is null and old.deleted_at is not null then
    new.deleted_by := null;
    new.deletion_reason := null;
    new.status := 'active';
  elsif new.status = old.status and old.deleted_at is null then
    new.status := 'edited';
  end if;
  return new;
end; $$;
create trigger orders_bu before update on public.orders for each row execute function public.orders_before_update();

create or replace function public.orders_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_action('order_created','order',new.id,null,to_jsonb(new));
  else
    perform public.log_action(
      case when new.deleted_at is not null and old.deleted_at is null then 'order_deleted'
           when new.deleted_at is null and old.deleted_at is not null then 'order_restored'
           else 'order_updated' end,
      'order', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return null;
end; $$;
create trigger orders_audit_t after insert or update on public.orders for each row execute function public.orders_audit();

-- NEW USER PROFILE
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'user'))
  on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- SEED
insert into public.accounting_periods (name, start_date, status)
values ('عمولات ' || to_char(current_date,'MM/YYYY'), date_trunc('month', current_date)::date, 'open');

insert into public.captains (name, phone, vehicle_number, current_commission_percentage) values
  ('أحمد الخطيب','0933111222','١٢٣٤٥٦', 7),
  ('محمود العلي','0944333444','٢٢٣٣٤٤', 8),
  ('سامر الحسن','0955555666','٥٥٦٦٧٧', 6.5),
  ('خالد إبراهيم','0966777888','٧٧٨٨٩٩', 7.5),
  ('عمر ديب','0977999000','٩٩٠٠١١', 5);
