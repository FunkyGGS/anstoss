-- Fußball-Manager: Datenbank-Einrichtung für Supabase
-- Im Supabase-Dashboard unter "SQL Editor" komplett einfügen und ausführen.
-- Danach die drei Werte unten (Startdatum, Einladungscode, Spielname) bei Bedarf anpassen.

create extension if not exists pgcrypto;

-- Spiel (eine Zeile). Das Geheimnis bleibt auf dem Server und erzeugt die täglichen Zufallswerte.
create table if not exists public.game (
  id int primary key default 1 check (id = 1),
  name text not null default 'Anstoß',
  start_date date not null default ((now() at time zone 'Europe/Berlin')::date + 1),
  invite_code text not null default 'ANSTOSS',
  secret text not null default encode(gen_random_bytes(24), 'hex')
);
insert into public.game (id) values (1) on conflict (id) do nothing;

create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  joined_at timestamptz not null default now()
);

create table if not exists public.actions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  eff_day int not null default 1
);
create index if not exists actions_eff_day on public.actions(eff_day);

-- Spieltag d (1 = Starttag) wird um 18:00 Uhr deutscher Zeit ausgetragen.
-- Aktionen gelten für den nächsten Spieltag, dessen Anpfiff noch bevorsteht.
create or replace function public.current_eff_day() returns int language sql stable as $$
  select greatest(1,
    ((now() at time zone 'Europe/Berlin')::date - g.start_date) + 1
    + case when (now() at time zone 'Europe/Berlin')::time >= time '18:00' then 1 else 0 end)
  from public.game g where g.id = 1
$$;

create or replace function public.actions_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  new.eff_day := public.current_eff_day();
  if not exists (select 1 from public.members m where m.user_id = auth.uid()) then
    raise exception 'Nicht Mitglied des Spiels';
  end if;
  if char_length(new.type) > 30 or pg_column_size(new.payload) > 2000 then
    raise exception 'Aktion zu groß';
  end if;
  return new;
end $$;
drop trigger if exists actions_bi on public.actions;
create trigger actions_bi before insert on public.actions for each row execute function public.actions_before_insert();

-- Öffentliche Spielinfos (ohne Geheimnis)
create or replace function public.game_info() returns json language sql stable security definer set search_path = public as $$
  select json_build_object('name', name, 'start_date', start_date, 'eff_day', public.current_eff_day(), 'now', now())
  from public.game where id = 1
$$;

-- Alle bereits freigegebenen Tageswerte: Tag 0 (Vorsaison) ab 18:00 am Vortag des Starts, Tag d ab 18:00 am Spieltag.
create or replace function public.revealed_seeds() returns setof text language sql stable security definer set search_path = public as $$
  with g as (select * from public.game where id = 1),
  mx as (
    select ((now() at time zone 'Europe/Berlin')::date - g.start_date) + 1
      - case when (now() at time zone 'Europe/Berlin')::time < time '18:00' then 1 else 0 end as d
    from g
  )
  select md5(g.secret || ':' || s.d) from g, mx, generate_series(0, mx.d) as s(d) where mx.d >= 0 order by s.d
$$;

-- Beitritt mit Einladungscode
create or replace function public.join_game(code text, name text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if not exists (select 1 from public.game where id = 1 and upper(invite_code) = upper(trim(code))) then
    raise exception 'Falscher Einladungscode';
  end if;
  insert into public.members(user_id, display_name) values (auth.uid(), trim(name))
  on conflict (user_id) do update set display_name = excluded.display_name;
end $$;

create or replace function public.is_member() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.user_id = auth.uid())
$$;

alter table public.game enable row level security;
alter table public.members enable row level security;
alter table public.actions enable row level security;
-- game: kein direkter Zugriff (nur über die Funktionen oben)
drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (public.is_member());
drop policy if exists actions_read on public.actions;
create policy actions_read on public.actions for select to authenticated using (public.is_member());
drop policy if exists actions_insert on public.actions;
create policy actions_insert on public.actions for insert to authenticated with check (public.is_member());

grant usage on schema public to authenticated;
grant select, insert on public.members, public.actions to authenticated;
grant usage, select on sequence public.actions_id_seq to authenticated;
revoke all on public.game from anon, authenticated;
grant execute on function public.game_info(), public.revealed_seeds(), public.join_game(text, text), public.current_eff_day(), public.is_member() to authenticated;

-- Anpassen (optional):
-- update public.game set start_date = '2026-11-23', invite_code = 'MEINCODE', name = 'Kreisliga-Manager' where id = 1;

create table if not exists public.messages (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  to_user uuid references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_to_user on public.messages(to_user);

create or replace function public.messages_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end $$;
drop trigger if exists messages_bi on public.messages;
create trigger messages_bi before insert on public.messages for each row execute function public.messages_before_insert();

alter table public.messages enable row level security;
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (public.is_member() and (to_user is null or to_user = auth.uid() or user_id = auth.uid()));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (public.is_member() and (to_user is null or exists (select 1 from public.members m where m.user_id = to_user)));
grant select, insert on public.messages to authenticated;
grant usage, select on sequence public.messages_id_seq to authenticated;
