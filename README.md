# SyllaBuddy

SyllaBuddy is a React + Vite student task planner with Supabase authentication,
cloud-synced tasks, opt-in deadline reminders, and an interactive Study Hub.

## Local development

1. Install Node.js 20.19+ or 22.12+.
2. Create a Supabase project and follow [Supabase setup](./SUPABASE_SETUP.md).
3. Copy `.env.example` to `.env.local` and set the project URL and public
   publishable/anon key. Do not put a service-role key in a `VITE_` variable.
4. Install dependencies and run the app:

   ```sh
   npm install
   npm run dev
   ```

The app displays a setup message until its Supabase URL and public key are set.
The SQL migration, scheduled Edge Function, and push-notification service worker
must also be deployed before cloud sync or deadline reminders can work.

## Checks

```sh
npm run lint
npm run build
```

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for migrations, authentication
settings, scheduled reminder deployment, local-task import, and a manual test
checklist.
