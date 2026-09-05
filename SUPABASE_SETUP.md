# Supabase setup

## 1. Create tables

Open Supabase Dashboard -> SQL Editor and run:

```sql
-- paste contents of supabase/schema.sql
```

This creates:

- `statistics`
- `notifications`
- `partners`
- `reviews`
- public Storage bucket `partners`

## 2. Set environment variables on Vercel

Project Settings -> Environment Variables:

```txt
ADMIN_PASSWORD=<admin password used on /admin.html>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SUPABASE_ANON_KEY=<anon public key>
```

Optional Google reviews:

```txt
GOOGLE_PLACES_API_KEY=<google places api key>
GOOGLE_PLACE_ID=<google place id>
```

Use the `service_role` key only in Vercel/server environment variables. Never expose it in browser code.

## 3. Redeploy

After saving env vars, redeploy the latest `main` deployment.

## 4. Verify

Open:

```txt
https://www.kontrolavozidiel.sk/api/health
```

Expected:

```json
{
  "supabase": {
    "initialized": true,
    "serviceRole": true,
    "env": {
      "url": "set",
      "serviceRoleKey": "set",
      "anonKey": "set"
    }
  }
}
```

Then open `/admin.html`, log in with `ADMIN_PASSWORD`, and save statistics.
