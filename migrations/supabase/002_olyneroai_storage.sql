begin;

insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do update set public = false;

commit;
