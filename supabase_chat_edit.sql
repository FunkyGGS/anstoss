-- Anstoß: Chat-Nachrichten bearbeiten und löschen (einmalig im Supabase SQL Editor ausführen)
alter table public.messages add column if not exists edited_at timestamptz;

-- Beim Bearbeiten dürfen sich nur Text und edited_at ändern
create or replace function public.messages_before_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.user_id := old.user_id;
  new.to_user := old.to_user;
  new.created_at := old.created_at;
  new.edited_at := now();
  return new;
end $$;
drop trigger if exists messages_bu on public.messages;
create trigger messages_bu before update on public.messages for each row execute function public.messages_before_update();

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete to authenticated
  using (user_id = auth.uid());
grant update (body), delete on public.messages to authenticated;
