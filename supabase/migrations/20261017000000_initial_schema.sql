create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'UTC',
  notifications_enabled boolean not null default true,
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 150),
  subject text not null check (char_length(trim(subject)) between 1 and 100),
  description text,
  due_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'missed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id)
);

create index tasks_user_status_due_idx
  on public.tasks (user_id, status, due_at);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid,
  subject text not null default '',
  technique text not null
    check (technique in ('active-recall', 'spaced-repetition', 'feynman', 'pomodoro', 'interleaving')),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  constraint study_sessions_task_owner_fkey
    foreign key (task_id, user_id)
    references public.tasks(id, user_id)
    on delete set null (task_id)
);

create index study_sessions_user_completed_idx
  on public.study_sessions (user_id, completed_at desc);

create table public.study_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (char_length(trim(topic)) between 1 and 120),
  question text not null check (char_length(trim(question)) between 1 and 2000),
  answer text not null check (char_length(trim(answer)) between 1 and 4000),
  due_at timestamptz,
  interval_days integer not null default 0 check (interval_days >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  ease_factor numeric(4, 2) not null default 2.50 check (ease_factor between 1.30 and 4.00),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index study_cards_user_due_idx
  on public.study_cards (user_id, due_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  type text not null default 'deadline-reminder',
  reminder_stage smallint check (reminder_stage in (1, 2)),
  title text not null,
  message text not null,
  scheduled_at timestamptz not null,
  processing_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  delivery_error text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'cancelled', 'failed')),
  created_at timestamptz not null default now(),
  constraint notifications_task_stage_unique unique (task_id, reminder_stage)
);

create index notifications_due_idx
  on public.notifications (scheduled_at)
  where status = 'pending';
create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create or replace function public.claim_due_notifications(batch_limit integer default 100)
returns setof public.notifications
language sql
security definer
set search_path = ''
as $$
  with due as (
    select id
    from public.notifications
    where (
      (status = 'pending' and scheduled_at <= now())
      or (status = 'processing' and processing_at < now() - interval '10 minutes')
    )
    order by scheduled_at
    for update skip locked
    limit greatest(1, least(batch_limit, 500))
  )
  update public.notifications as notification
  set status = 'processing',
      processing_at = now()
  from due
  where notification.id = due.id
  returning notification.*;
$$;

revoke all on function public.claim_due_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(integer) to service_role;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = new.timezone
  ) then
    raise exception 'Invalid IANA timezone: %', new.timezone;
  end if;
  return new;
end;
$$;

create trigger profiles_validate_timezone
before insert or update of timezone on public.profiles
for each row execute function public.validate_profile_timezone();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger study_cards_set_updated_at
before update on public.study_cards
for each row execute function public.set_updated_at();

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.schedule_task_reminders_for_task(target_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reminder_days integer;
  planned_at timestamptz;
  task_row record;
  user_timezone text;
begin
  select tasks.*, coalesce(profiles.timezone, 'UTC') as timezone
  into task_row
  from public.tasks
  left join public.profiles on profiles.id = tasks.user_id
  where tasks.id = target_task_id;

  if not found then
    return;
  end if;

  update public.notifications
  set status = 'cancelled'
  where notifications.task_id = target_task_id
    and status in ('pending', 'processing');

  if task_row.status <> 'active' then
    return;
  end if;

  user_timezone := task_row.timezone;
  foreach reminder_days in array array[2, 1] loop
    planned_at :=
      ((task_row.due_at at time zone user_timezone) - make_interval(days => reminder_days))
      at time zone user_timezone;

    if planned_at > now() then
      insert into public.notifications (
        user_id, task_id, reminder_stage, title, message, scheduled_at, status
      )
      values (
        task_row.user_id,
        task_row.id,
        reminder_days,
        'Upcoming deadline',
        task_row.name || ' for ' || task_row.subject || ' is due in ' || reminder_days || ' day(s).',
        planned_at,
        'pending'
      )
      on conflict (task_id, reminder_stage) do update
      set user_id = excluded.user_id,
          title = excluded.title,
          message = excluded.message,
          scheduled_at = excluded.scheduled_at,
          status = excluded.status,
          sent_at = null,
          read_at = null,
          processing_at = null;
    end if;
  end loop;
end;
$$;

create or replace function public.schedule_task_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.schedule_task_reminders_for_task(new.id);
  return new;
end;
$$;

create trigger tasks_schedule_reminders
after insert or update of due_at, status, name, subject on public.tasks
for each row execute function public.schedule_task_reminders();

create or replace function public.reschedule_profile_task_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_id uuid;
begin
  if old.timezone is distinct from new.timezone then
    for task_id in
      select id from public.tasks where user_id = new.id and status = 'active'
    loop
      perform public.schedule_task_reminders_for_task(task_id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger profiles_reschedule_task_reminders
after update of timezone on public.profiles
for each row execute function public.reschedule_profile_task_reminders();

revoke all on function public.schedule_task_reminders_for_task(uuid)
  from public, anon, authenticated;

create or replace function public.cancel_task_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notifications
  set status = 'cancelled'
  where task_id = old.id and status in ('pending', 'processing');
  return old;
end;
$$;

create trigger tasks_cancel_reminders
before delete on public.tasks
for each row execute function public.cancel_task_reminders();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_cards enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can manage their own tasks"
  on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own study sessions"
  on public.study_sessions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      task_id is null
      or exists (
        select 1 from public.tasks
        where tasks.id = task_id and tasks.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can manage their own study cards"
  on public.study_cards for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own notifications"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can mark their own notifications read"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own push subscriptions"
  on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, timezone, notifications_enabled, push_enabled)
  on public.profiles to authenticated;

grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.study_sessions to authenticated;
grant select, insert, update, delete on public.study_cards to authenticated;
grant select, update (read_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.study_cards;
alter publication supabase_realtime add table public.study_sessions;
