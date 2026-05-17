-- Kategória partnera: hero | exkluzivny | medialny | hlavny
-- Existujúci partneri ostávajú v hero pásiku.
alter table public.partners
  add column if not exists category text not null default 'hero';

alter table public.partners
  drop constraint if exists partners_category_check;

alter table public.partners
  add constraint partners_category_check
  check (category in ('hero', 'exkluzivny', 'medialny', 'hlavny'));

create index if not exists partners_category_active_sort_idx
  on public.partners (category, active, sort_order, created_at);
