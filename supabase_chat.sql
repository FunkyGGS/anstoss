-- Anstoß: Chat (einmalig im Supabase SQL Editor ausführen)
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
