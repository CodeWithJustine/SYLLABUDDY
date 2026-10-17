# Supabase setup and deployment

This repository contains the client application and the server-side reminder
function. You must create and configure your own Supabase project; nothing in
this repository connects to a project by default.

## 1. Create and configure the Supabase project

1. Create a Supabase project and save its project URL and publishable (or legacy
   anon) key.
2. In **Authentication → URL Configuration**, add the local and production
   application URLs to the allowed redirect URLs, including `/reset-password`.
   Configure the email provider and sender required for signup confirmation and
   password recovery.
3. Apply `supabase/migrations/20261017000000_initial_schema.sql` once:
   - With the Supabase CLI: install the CLI, run `supabase login`, link this
     directory to your project with `supabase link --project-ref <project-ref>`,
     then run `supabase db push`.
   - Or paste the migration into the Supabase SQL Editor and run it.
4. The migration creates profiles, tasks, study sessions, study cards,
   notifications, push subscriptions, indexes, ownership constraints, RLS
   policies, reminder scheduling triggers, and the Realtime publication entries.
   It also creates the new profile row after each Supabase Auth signup.

All user tables have RLS enabled. The `authenticated` role can access only rows
with its own `auth.uid()`. Profile updates are column-limited; clients cannot
create or modify notification delivery records. Task references in study
sessions are constrained to tasks belonging to the same user. The scheduled
function alone uses the server-side service-role key; it is never shipped to the
browser.

## 2. Configure the frontend

Copy `.env.example` to `.env.local` and fill in:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-publishable-or-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

Only public client values may use a `VITE_` prefix. Never put
`SUPABASE_SERVICE_ROLE_KEY`, a VAPID private key, or the cron secret in this
file. Keep `.env.local` out of source control. Restart Vite after editing it.

Signup asks for email and display name. Supabase Auth owns the password and
session; the app does not copy passwords or auth tokens into its own
`localStorage`. Existing local mock accounts cannot be transferred. A signed-in
user can choose **Import tasks from this browser** on the dashboard to copy one
selected legacy account's task history. This does not import mock passwords,
does not remove the browser's original tasks, and is deliberately limited to
once per account/browser.

## 3. Deploy reliable reminders

The task trigger stores one unique reminder record per task for the 2-day and
1-day stages. Deadlines are stored as `timestamptz`; the profile holds an IANA
timezone. The trigger calculates each reminder at the same local wall-clock time
in that timezone and recalculates pending reminders when the deadline, task
status, task name, subject, or profile timezone changes. A row-locking claim
function prevents overlapping cron runs from delivering the same reminder.

1. Generate a VAPID key pair with a trusted Web Push key generator. Keep the
   private key private.
2. Deploy the function from the repository root with the Supabase CLI:

   ```sh
   supabase functions deploy send-due-reminders
   ```

3. In **Project Settings → Edge Functions → Secrets** (or with the CLI), set:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (a valid `mailto:` contact or HTTPS URL)
   - `REMINDER_CRON_SECRET` (a long, randomly generated secret)

   Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge
   Functions. If your deployment does not supply them automatically, configure
   them only as Edge Function secrets, never as frontend variables.
4. Set `VITE_VAPID_PUBLIC_KEY` in the frontend environment to the same public
   VAPID key; rebuild and deploy the frontend.
5. Enable `pg_cron`, `pg_net`, and Supabase Vault for the project if not already
   enabled. Store the Edge Function URL and the cron secret in Vault using the
   Supabase Dashboard's Vault interface or the SQL Editor. Do not hard-code
   secret values into a committed migration.
6. Schedule a one-minute job in the SQL Editor, replacing the URL placeholder
   and using the Vault secret names chosen in step 5:

   ```sql
   select cron.schedule(
     'syllabuddy-send-due-reminders',
     '* * * * *',
     $job$
       select net.http_post(
         url := (
           select decrypted_secret
           from vault.decrypted_secrets
           where name = 'reminder_function_url'
         ),
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer ' || (
             select decrypted_secret
             from vault.decrypted_secrets
             where name = 'reminder_cron_secret'
           )
         ),
         body := '{}'::jsonb
       );
     $job$
   );
   ```

   The Vault entry `reminder_function_url` must contain the deployed function
   URL, and `reminder_cron_secret` must exactly match the Edge Function's
   `REMINDER_CRON_SECRET`. Use Vault to keep both values out of SQL history and
   source control. Confirm the cron job and function logs in Supabase.

In-app reminder history is stored in the `notifications` table and appears in
the notification center after the server marks a reminder delivered. Browser
push is a separate, optional delivery channel: its permission request is made
only after the user enables it. Each device/browser needs its own opt-in
subscription. Delivery still depends on browser support, permission, device
settings, network access, and push-service availability. A failed push does
not erase in-app history.

## 4. Hosting notes

- Serve the frontend over HTTPS in production; service workers and Web Push
  require a secure context (localhost is allowed for development).
- Configure the static host to serve `index.html` for `/login`, `/study`, and
  `/reset-password` so React Router can restore those routes.
- Deploy `public/sw.js` at the site root. Vite copies it to the root of `dist`.
- Set frontend environment values in the hosting provider and rebuild the
  frontend after changing them.
- iOS Web Push requires a supported iOS version and an installed Home Screen web
  app; support differs by browser and operating system.

## 5. Migration and manual verification

Mock usernames and passwords are not Supabase users. Each person must create a
new email-based account and import only their own old task history from the
browser where it is saved. The import does not transfer password hashes or
sessions.

Manual checklist:

1. Register, confirm email if required, sign in, refresh, reset a password, and
   sign out. Confirm protected routes redirect to sign in.
2. Create, edit, complete, miss, and delete tasks. Sign in on a second browser
   as the same account and verify Realtime updates; use another account to
   verify row isolation.
3. Change a deadline and timezone. Verify pending reminder rows reschedule;
   mark a task completed or delete it and verify its pending reminders cancel.
4. With test tasks whose due times are exactly 2 days and 1 day ahead, confirm
   the cron job writes one delivered notification per stage and that repeat
   cron calls do not duplicate delivery.
5. Enable in-app reminders independently of push; enable push using a user
   click; deny permission and verify the app explains how to enable it later.
   Test push click-through, unsubscribe, and stale subscriptions.
6. Create and practise saved cards, spaced reviews, Feynman sessions,
   Interleaving practice, and Pomodoro focus/break cycles. Refresh during a
   running timer and verify its countdown uses the saved end timestamp.
7. Test task detail keyboard controls (Tab, Shift+Tab, Escape), edit conflicts
   from two sessions, mobile widths, light/dark mode, offline error states, and
   browser timezone/DST boundary times.

## Known limitations

- No Supabase project, database migration, Edge Function, cron job, VAPID key,
  or production host is provisioned by this repository.
- Web Push is best-effort across browsers/devices; operating-system settings and
  vendor push services can delay or suppress delivery.
- Old mock accounts cannot be migrated as authenticated accounts. Only task
  history is importable from the same browser origin where it was saved.
- Offline edits are not queued for later synchronization; the UI reports failed
  writes instead of claiming they were saved.
- Account deletion is not provided in the UI; configure and document an account
  deletion process before inviting real users.
- Review intervals are simple suggested intervals, not a promise of learning
  outcomes.
