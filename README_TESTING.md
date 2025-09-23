Verification flow and local testing

- Client page: `app/auth/verify/page.jsx` — visits `/auth/verify?token=...` and POSTs the token to `/api/auth/verify` using `apiFetch`.
- Environment variables:
  - `NEXT_PUBLIC_API_URL` — set to your API origin if the API is cross-origin (e.g. `https://mytarotreadingsserver.vercel.app`). If you host the API on the same origin, this can be left unset.
  - On the server side, set `CLIENT_URL` (or `NEXT_PUBLIC_CLIENT_URL` depending on your server's config) to the client origin (`https://mytarotreadings.vercel.app`) so email verification links redirect back to the correct client URL.

Local test steps:
1. Add to `.env.local` (client):
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```
2. Start dev: `npm run dev`
3. In a browser visit: `http://localhost:3000/auth/verify?token=PASTE_TOKEN_HERE`

On success the page will redirect to `/auth/success`.
