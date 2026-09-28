-- Distribuidora JYM — ejecutar en el SQL Editor de Supabase
-- Este script es idempotente en lo posible (IF NOT EXISTS / DROP POLICY IF EXISTS).

create extension if not exists pgcrypto;

-- =========================
-- Perfiles
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  apellidos text not null default '',
  telefono text not null default '',
  direccion text not null default '',
  rol text not null default 'cliente' check (rol in ('cliente', 'admin')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists nombre text not null default '',
  add column if not exists apellidos text not null default '',
  add column if not exists telefono text not null default '',
  add column if not exists direccion text not null default '',
  add column if not exists rol text not null default 'cliente',
  add column if not exists activo boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- =========================
-- Categorías / productos / carritos
-- =========================
create table if not exists public.categorias (
  id bigint generated always as identity primary key,
  nombre text not null,
  activo boolean not null default true,
  orden integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categorias
  add column if not exists activo boolean not null default true,
  add column if not exists orden integer default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.carritos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.pedidos (
  id bigint generated always as identity primary key,
  numero text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmado','preparando','enviado','entregado','cancelado')),
  subtotal numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  telefono text,
  direccion text,
  metodo_pago text not null default 'Pago contra entrega',
  metodo_entrega text not null default 'Entrega a domicilio',
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pedido_detalles (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references public.pedidos(id) on delete cascade,
  producto_id bigint,
  nombre text not null,
  codigo text,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(14,2) not null,
  subtotal numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists pedidos_user_id_idx on public.pedidos(user_id);
create index if not exists pedidos_estado_idx on public.pedidos(estado);
create index if not exists pedido_detalles_pedido_id_idx on public.pedido_detalles(pedido_id);
create index if not exists productos_categoria_id_idx on public.productos(categoria_id);
create index if not exists productos_activo_idx on public.productos(activo);

-- =========================
-- Helpers de seguridad
-- =========================
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and rol = 'admin'
      and coalesce(activo, true) = true
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists categorias_set_updated_at on public.categorias;
create trigger categorias_set_updated_at
before update on public.categorias
for each row execute function public.set_updated_at();

drop trigger if exists pedidos_set_updated_at on public.pedidos;
create trigger pedidos_set_updated_at
before update on public.pedidos
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, apellidos, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellidos', ''),
    'cliente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.rol is distinct from old.rol and not public.es_admin() then
    raise exception 'No tienes permiso para cambiar el rol';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_role_self_escalation();

-- =========================
-- Pedido: crear con validación de stock
-- =========================
create or replace function public.crear_pedido(
  p_telefono text,
  p_direccion text,
  p_metodo_pago text,
  p_metodo_entrega text,
  p_notas text default null
)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_items jsonb;
  v_item jsonb;
  v_producto public.productos%rowtype;
  v_cantidad integer;
  v_precio numeric(14,2);
  v_subtotal numeric(14,2) := 0;
  v_iva numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_pedido public.pedidos;
  v_numero text;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión para crear un pedido';
  end if;

  select items into v_items from public.carritos where user_id = v_user;
  if v_items is null or jsonb_array_length(v_items) = 0 then
    raise exception 'Tu carrito está vacío';
  end if;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    v_cantidad := greatest(1, coalesce((v_item->>'cantidad')::int, 1));

    select * into v_producto
    from public.productos
    where id = (v_item->>'id')::bigint
    for update;

    if not found or v_producto.activo is not true then
      raise exception 'Hay un producto inactivo o inexistente en el carrito';
    end if;

    if v_producto.stock is not null and v_producto.stock < v_cantidad then
      raise exception 'Stock insuficiente para %', v_producto.nombre;
    end if;

    v_precio := coalesce(v_producto.precio_con_iva, v_producto.precio, 0);
    v_total := v_total + (v_precio * v_cantidad);
    v_subtotal := v_subtotal + (coalesce(v_producto.precio, v_precio) * v_cantidad);
  end loop;

  v_iva := greatest(v_total - v_subtotal, 0);
  v_numero := 'JYM-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);

  insert into public.pedidos (
    numero, user_id, estado, subtotal, iva, total,
    telefono, direccion, metodo_pago, metodo_entrega, notas
  )
  values (
    v_numero, v_user, 'pendiente', v_subtotal, v_iva, v_total,
    p_telefono, p_direccion, coalesce(p_metodo_pago, 'Pago contra entrega'),
    coalesce(p_metodo_entrega, 'Entrega a domicilio'), p_notas
  )
  returning * into v_pedido;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    v_cantidad := greatest(1, coalesce((v_item->>'cantidad')::int, 1));

    select * into v_producto
    from public.productos
    where id = (v_item->>'id')::bigint
    for update;

    v_precio := coalesce(v_producto.precio_con_iva, v_producto.precio, 0);

    insert into public.pedido_detalles (
      pedido_id, producto_id, nombre, codigo, cantidad, precio_unitario, subtotal
    ) values (
      v_pedido.id,
      v_producto.id,
      v_producto.nombre,
      v_producto.codigo,
      v_cantidad,
      v_precio,
      v_precio * v_cantidad
    );

    if v_producto.stock is not null then
      update public.productos
      set stock = stock - v_cantidad
      where id = v_producto.id;
    end if;
  end loop;

  update public.carritos set items = '[]'::jsonb, updated_at = now() where user_id = v_user;

  return v_pedido;
end;
$$;

grant execute on function public.crear_pedido(text, text, text, text, text) to authenticated;

-- =========================
-- RLS
-- =========================
alter table public.profiles enable row level security;
alter table public.carritos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_detalles enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.es_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid() or public.es_admin())
with check (id = auth.uid() or public.es_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid() or public.es_admin());

drop policy if exists "carritos_own" on public.carritos;
create policy "carritos_own"
on public.carritos for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "pedidos_select" on public.pedidos;
create policy "pedidos_select"
on public.pedidos for select
using (user_id = auth.uid() or public.es_admin());

drop policy if exists "pedidos_update_admin" on public.pedidos;
create policy "pedidos_update_admin"
on public.pedidos for update
using (public.es_admin())
with check (public.es_admin());

drop policy if exists "pedido_detalles_select" on public.pedido_detalles;
create policy "pedido_detalles_select"
on public.pedido_detalles for select
using (
  public.es_admin()
  or exists (
    select 1 from public.pedidos p
    where p.id = pedido_id and p.user_id = auth.uid()
  )
);

drop policy if exists "categorias_public_read" on public.categorias;
create policy "categorias_public_read"
on public.categorias for select
using (activo = true or public.es_admin());

drop policy if exists "categorias_admin_write" on public.categorias;
create policy "categorias_admin_write"
on public.categorias for all
using (public.es_admin())
with check (public.es_admin());

drop policy if exists "productos_public_read" on public.productos;
create policy "productos_public_read"
on public.productos for select
using (activo = true or public.es_admin());

drop policy if exists "productos_admin_write" on public.productos;
create policy "productos_admin_write"
on public.productos for all
using (public.es_admin())
with check (public.es_admin());
