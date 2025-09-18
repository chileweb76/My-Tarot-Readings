Vercel deployment notes

This repository is a monorepo with two workspaces:

- `client` – Next.js app (this is what should be deployed to Vercel)
- `server` – Express API / backend (not uploaded by default via `.vercelignore`)

Quick steps to deploy the `client` on Vercel:

1. From the Vercel dashboard, import this Git repository.
2. Set the project root to the repository root. The included `vercel.json` will use `client/package.json` to build the Next.js app.
3. Add required Environment Variables in Vercel (see below).
4. Deploy.

Recommended environment variables for the client (these come from your runtime):
- `NEXT_PUBLIC_API_URL` – URL of your API server (if you host the server separately).
- Any OAuth client ids used by the app (e.g. `GOOGLE_CLIENT_ID`) – set as Environment Variables.

If you intend to also deploy the `server` to Vercel, consider extracting it into a separate Vercel project (serverless functions or separate deployment) and provide a stable API URL to the client via `NEXT_PUBLIC_API_URL`.
