-- Склад эсеби: Supabase үчүн база түзүмү.
-- Supabase → SQL Editor → New query → ушуну толугу менен коюп → Run.

-- 1) Таблицалар
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'manager' check (role in ('admin','keeper','manager'))
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  price numeric not null default 0,
  unit text not null default 'шт',
  barcode text not null default '',
  min_stock numeric not null default 0,
  photo text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.moves (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  type text not null check (type in ('in','out')),
  qty numeric not null check (qty > 0),
  date date not null,
  supplier text not null default '',
  reason text not null default '',
  note text not null default '',
  user_name text not null default '',
  created_at timestamptz not null default now()
);

-- 2) Жаңы колдонуучу катталганда профиль түзүү (биринчиси — админ)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id, new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), new.email),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'manager' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Ролду текшерүүчү функция
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- 4) Коопсуздук эрежелери (RLS)
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.moves    enable row level security;

drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_update" on public.profiles for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists "products_read"  on public.products;
drop policy if exists "products_write" on public.products;
create policy "products_read"  on public.products for select to authenticated using (true);
create policy "products_write" on public.products for all to authenticated
  using (public.my_role() in ('admin','keeper')) with check (public.my_role() in ('admin','keeper'));

drop policy if exists "moves_read"   on public.moves;
drop policy if exists "moves_insert" on public.moves;
create policy "moves_read"   on public.moves for select to authenticated using (true);
create policy "moves_insert" on public.moves for insert to authenticated
  with check (public.my_role() in ('admin','keeper'));
-- moves үчүн update/delete эрежеси жок: операциялар тарыхы өзгөрбөйт.
