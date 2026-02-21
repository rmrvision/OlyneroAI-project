begin;

alter table profiles
  add column if not exists is_disabled boolean not null default false;

alter table profiles
  add column if not exists limits jsonb not null default '{}'::jsonb;

drop policy if exists profiles_update_own_or_admin on profiles;

create policy profiles_update_admin
  on profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create policy profiles_update_self_safe
  on profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles p where p.id = auth.uid())
    and is_disabled = (select is_disabled from public.profiles p where p.id = auth.uid())
    and limits = (select limits from public.profiles p where p.id = auth.uid())
  );

commit;
