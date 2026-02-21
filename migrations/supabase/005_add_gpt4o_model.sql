begin;

-- Add gpt-4o models
insert into ai_models (provider_key, model_id, display_name, context_window)
values
  ('openai', 'gpt-4o', 'GPT-4o', 128000),
  ('openai', 'gpt-4o-mini', 'GPT-4o mini', 128000),
  ('openai', 'gpt-4.1', 'GPT-4.1', 1000000),
  ('openai', 'gpt-4.1-mini', 'GPT-4.1 mini', 1000000)
on conflict (provider_key, model_id) do nothing;

-- Set gpt-4o as the active model if no model is currently set,
-- OR update to gpt-4o if current is gpt-4.1-mini (the old default)
update ai_settings
set
  active_provider_key = 'openai',
  active_model_id = (
    select id from ai_models
    where provider_key = 'openai' and model_id = 'gpt-4o'
    limit 1
  )
where exists (select 1 from ai_settings);

-- Insert if no settings exist
insert into ai_settings (active_provider_key, active_model_id)
select 'openai', m.id
from ai_models m
where m.provider_key = 'openai' and m.model_id = 'gpt-4o'
and not exists (select 1 from ai_settings);

commit;
