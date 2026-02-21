begin;

create table if not exists ai_providers (
  key text primary key,
  name text not null,
  base_url text,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references ai_providers(key) on delete cascade,
  model_id text not null,
  display_name text not null,
  context_window integer,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider_key, model_id)
);

create table if not exists ai_settings (
  id uuid primary key default gen_random_uuid(),
  active_provider_key text references ai_providers(key),
  active_model_id uuid references ai_models(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_settings_touch_updated_at on ai_settings;
create trigger ai_settings_touch_updated_at
before update on ai_settings
for each row execute procedure public.touch_updated_at();

alter table ai_providers enable row level security;
alter table ai_models enable row level security;
alter table ai_settings enable row level security;

create policy ai_providers_admin
  on ai_providers for all
  using (public.is_admin())
  with check (public.is_admin());

create policy ai_models_admin
  on ai_models for all
  using (public.is_admin())
  with check (public.is_admin());

create policy ai_settings_admin
  on ai_settings for all
  using (public.is_admin())
  with check (public.is_admin());

insert into ai_providers (key, name, base_url)
values
  ('openai', 'OpenAI', 'https://api.openai.com/v1'),
  ('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1')
on conflict (key) do nothing;

insert into ai_models (provider_key, model_id, display_name, context_window)
values
  ('openai', 'gpt-4.1-mini', 'GPT-4.1 mini', 1048576),
  ('openai', 'gpt-4o-mini', 'GPT-4o mini', 128000),
  ('deepseek', 'deepseek-chat', 'DeepSeek Chat', 128000),
  ('deepseek', 'deepseek-reasoner', 'DeepSeek Reasoner', 128000)
on conflict (provider_key, model_id) do nothing;

insert into ai_settings (active_provider_key, active_model_id)
select 'openai', m.id
from ai_models m
where m.provider_key = 'openai' and m.model_id = 'gpt-4.1-mini'
and not exists (select 1 from ai_settings);

commit;
