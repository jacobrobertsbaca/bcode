# Hosting

> Requires Node v18.17.0. 

`bcode` runs on a combination of [Supabase](https://supabase.com) and [Vercel](https://vercel.com). To run through your own Supabase organization, you'll need to set up a Supabase project for the app. To deploy to the web, you can host the app on Vercel. Instructions for configuring both of these are given below.

## Supabase

To get started, [create a Supabase project](https://supabase.com/dashboard/new/_) with the following configuration.

### Tables

The following Postgres tables are required to run. You can create these by running the queries below in the [Supabase SQL editor](https://supabase.com/dashboard/project/_/sql/new).

```sql
create table updates (
  id bigserial primary key,
  channel text not null,
  update bytea not null
);

create view updates_agg with (security_invoker) as (
  select channel, array_agg(update) as updates
  from updates
  group by channel
);

create table rooms (
  code text primary key,
  name text not null,
  language text not null,
  groups json not null,
  created timestamp not null
);
```

You should enable RLS on the `rooms` and `updates` tables so that clients cannot make arbitrary changes to them. Beyond enabling RLS, you do not need to add RLS policies to the tables because all modifications will be performed through a privileged Supabase client that bypasses RLS policies.

### Auth

You must [enable Github as an auth provider](https://supabase.com/dashboard/project/_/auth/providers) within Supabase to allow users to log in. You can do this by following the [Supabase guide for setting up Github OAuth](https://supabase.com/docs/guides/auth/social-login/auth-github), which explains the steps required to register an OAuth application with Github.

It is also recommended to disable the default email provider inside Supabase, as the app does not make use of email sign in.

### Environment Variables

In the root directory of this project, create a `.env.local` file with the following content, replacing items in brackets with your project's [Supabase URL/key](https://supabase.com/dashboard/project/_/settings/api).

```s
NEXT_PUBLIC_SUPABASE_URL=[Supabase URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Supabase Anonymous Key]
SUPABASE_SERVER_KEY=[Supabase Service Role Key]
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

|Variable|Meaning|
|----|----|
`NEXT_PUBLIC_SUPABASE_URL` | The Supabase project's URL ([see dashboard](https://supabase.com/dashboard/project/_/settings/api))
`NEXT_PUBLIC_SUPABASE_ANON_KEY` | The project's anonymous key ([see dashboard](https://supabase.com/dashboard/project/_/settings/api)). Used in browser, will be exposed to clients.
`SUPABASE_SERVER_KEY` | The project's `service_role` key ([see dashboard](https://supabase.com/dashboard/project/_/settings/api)). Only used server-side, will not be exposed to clients.
`NEXT_PUBLIC_SITE_URL` | The website URL (no trailing slashes). Used to generate QR code links.

### Running Locally

After following the steps above, you can run

```sh
npm run dev
```

to host the app locally at http://localhost:3000.


## Vercel

You can deploy the app to the web using Vercel. To do so, create a new Vercel project linked to your Github repo containing the project code. Once you have a public domain (e.g. something.vercel.app), follow the configuration steps below.

### Supabase Auth

You'll need to change your project's [URL configuration in Supabase](https://supabase.com/dashboard/project/_/auth/url-configuration) to match your public Vercel domain. On the URL configuration page, change the Site URL to your public domain and ensure the following URLs are allowed as redirect URLs:

- `https://{Your Domain}/auth/callback` — For users visiting your public domain
- `https://*-{Your Vercel Org}.vercel.app/auth/callback` — For Vercel preview deployments
- `http://localhost:3000/auth/callback` — For local development

You can add additional redirect URLs here depending on your deployment setup.

### Environment Variables

Update your local `NEXT_PUBLIC_SITE_URL` variable in `.env.local` to match your public domain. Then, update your Vercel project's **Settings > Environment Variables** by copy-and-pasting your `.env.local` into the Vercel environment variables settings. After a redeployment (so your app picks up the new values for these variables), the site should be good to go!