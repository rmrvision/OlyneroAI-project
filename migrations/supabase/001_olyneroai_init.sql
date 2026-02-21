begin;

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists builds (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  status text not null default 'queued',
  logs text,
  artifact_path text,
  preview_url text,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), new.email),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

alter table profiles enable row level security;
alter table projects enable row level security;
alter table builds enable row level security;
alter table audit_log enable row level security;
alter table settings enable row level security;

create policy profiles_select_own_or_admin
  on profiles for select
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own_or_admin
  on profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy profiles_insert_self
  on profiles for insert
  with check (id = auth.uid());

create policy projects_select_owner_or_admin
  on projects for select
  using (owner_id = auth.uid() or public.is_admin());

create policy projects_insert_owner_or_admin
  on projects for insert
  with check (owner_id = auth.uid() or public.is_admin());

create policy projects_update_owner_or_admin
  on projects for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy projects_delete_owner_or_admin
  on projects for delete
  using (owner_id = auth.uid() or public.is_admin());

create policy builds_select_owner_or_admin
  on builds for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = builds.project_id
        and (p.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy builds_insert_owner_or_admin
  on builds for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = builds.project_id
        and (p.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy builds_update_owner_or_admin
  on builds for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = builds.project_id
        and (p.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = builds.project_id
        and (p.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy builds_delete_owner_or_admin
  on builds for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = builds.project_id
        and (p.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy audit_log_admin_select
  on audit_log for select
  using (public.is_admin());

create policy audit_log_admin_insert
  on audit_log for insert
  with check (public.is_admin());

create policy audit_log_admin_update
  on audit_log for update
  using (public.is_admin())
  with check (public.is_admin());

create policy audit_log_admin_delete
  on audit_log for delete
  using (public.is_admin());

create policy settings_admin_select
  on settings for select
  using (public.is_admin());

create policy settings_admin_write
  on settings for all
  using (public.is_admin())
  with check (public.is_admin());

commit;
