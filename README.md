# The Mine — Frontend

Vue 3 + Vite app for The Mine, the 49ers player development tracker. Data, auth, and live
updates come from Supabase; the schema lives in
[TheMine_Supabase](https://github.com/grantmbordelon/TheMine_Supabase).

## Run it

```bash
cp .env.example .env   # fill in the project URL and publishable key
npm install
npm run dev
```

## How it's put together

- `src/stores/data.ts` loads every table once, then subscribes to Supabase Realtime. Any
  insert, update, or delete from another person lands in the reactive store, so every open
  tab, Present included, updates without a refresh. Rows that arrive live get a gold
  highlight and a NEW tag for about 90 seconds.
- `src/lib/derive.ts` computes all the dashboard figures from the rows (last contact,
  awaiting first check-in, overdue by tier cadence, open next steps). Nothing summary-like is stored.
- Meetings carry one set of notes per author. Logging a meeting for a player who already
  has one within a day offers "Add my notes to that one" instead of creating a duplicate.
- Access: sign up with email and password, pick your name, and enter the team join code.
  Admins can view or change the code on the Program Team tab.

## Deploy (Netlify)

`netlify.toml` is included. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the
site's environment variables. Both are safe in the browser; Row Level Security protects the data.
