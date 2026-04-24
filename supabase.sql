create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  active_order bigint not null default 0,
  code text not null,
  title text not null,
  goal text not null,
  assignee text not null check (assignee in ('Nhật Trường', 'Mỹ Tân', 'Phan Tú', 'Nhựt Hùng', 'Khác')),
  created_at date not null,
  start_date date not null,
  due_date date not null,
  previous_week text default '',
  this_week text default '',
  end_week text default '',
  is_hot boolean not null default false,
  completed boolean not null default false,
  completed_at date
);

alter table public.tasks add column if not exists active_order bigint not null default 0;
alter table public.tasks add column if not exists is_hot boolean not null default false;

alter table public.tasks enable row level security;

drop policy if exists "allow read tasks" on public.tasks;
drop policy if exists "allow insert tasks" on public.tasks;
drop policy if exists "allow update tasks" on public.tasks;
drop policy if exists "allow delete tasks" on public.tasks;

create policy "allow read tasks"
on public.tasks
for select
to anon
using (true);

create policy "allow insert tasks"
on public.tasks
for insert
to anon
with check (true);

create policy "allow update tasks"
on public.tasks
for update
to anon
using (true)
with check (true);

create policy "allow delete tasks"
on public.tasks
for delete
to anon
using (true);
