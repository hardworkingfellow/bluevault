# Bluevault backend

Standalone Node.js REST API backed by MongoDB. The frontend signs in and reads and writes account data through this API.

## Start

Requires Node.js 20 or newer.

```sh
npm start
```

`npm start` uses environment variables supplied by the host, as Render does. For local use with `backend/.env`, run `npm run start:local` (or `npm run dev`). Add production settings in Render's Environment page; do not upload `.env`.

The API listens on `http://localhost:4000` by default. Set `PORT` to change it. `FRONTEND_ORIGIN` controls the one allowed browser origin (defaults to `http://localhost:5173`). Set `MONGODB_URI` to your MongoDB Atlas connection string. The API uses the URI's database name, or `bluevault` if none is specified, and creates a `users` collection with a unique email index automatically.

### Configure JWT authentication

Set `JWT_SECRET` to a random secret (at least 32 characters recommended) and `JWT_EXPIRES_IN` to a duration such as `180d`. Login tokens are signed HS256 JWTs and expire according to that setting (default `180d`). Logout revokes tokens for the lifetime of the server process.

### Configure the first administrator

For local use, load `backend/.env` with `npm run start:local` or `npm run dev`. Copy `.env.example` to `.env`, then set a unique `ADMIN_EMAIL` and `ADMIN_PASSWORD` of 12–128 characters. `ADMIN_NAME`, `PORT`, and `FRONTEND_ORIGIN` are also configurable. On startup, the server creates or refreshes that admin account. Keep `.env` private; it is ignored by Git. The admin signs in through the same `/api/auth/login` endpoint as users, and the response includes `user.role: "admin"`.

PowerShell example (the values apply only to this terminal session):

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "choose-a-long-unique-password"
npm start
```

Then sign in with JSON `{ "email": "admin@example.com", "password": "your configured password" }` at `POST http://localhost:4000/api/auth/login`. Use the returned bearer token for admin endpoints. During Vite development, `/api` requests are proxied to `http://localhost:4000`; keep the backend running with a valid MongoDB connection. For a separately hosted API, set `VITE_API_URL` in the frontend environment to its URL.

## API

All request and response bodies use JSON. Authenticated routes require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness check |
| POST | `/api/auth/register` | Create account; requires `name`, `email`, `password` |
| POST | `/api/auth/login` | Verify credentials and issue bearer token |
| GET | `/api/auth/me` | Return current account (never its password hash) |
| POST | `/api/auth/logout` | Revoke the in-memory bearer token |
| GET | `/api/activity` | List current account's activity, newest first |
| POST | `/api/activity` | Record a bought, sold, sent, or received item and update the account balance |
| GET | `/api/admin/users` | List non-admin accounts (admin role required) |
| GET | `/api/admin/alerts` | List sent alerts with recipient details (admin role required) |
| GET | `/api/admin/activity` | List activity across non-admin accounts (admin role required) |
| POST | `/api/admin/users/:id/alerts` | Send a persisted alert to a user (admin role required) |
| GET | `/api/alerts` | List alerts for the signed-in user |
| PATCH | `/api/admin/users/:id/alerts/:alertId` | Edit a sent alert (admin role required) |
| DELETE | `/api/admin/users/:id/alerts/:alertId` | Delete a sent alert (admin role required) |
| PATCH | `/api/admin/users/:id` | Update account status and admin-managed wallet settings (admin role required) |
| POST | `/api/admin/users/:id/credit` | Credit an account balance and record the activity (admin role required) |

Admin wallet settings may include `depositAddresses`, an object keyed by asset ticker (for example, `SOL: { "address": "...", "network": "Solana" }`). Each supported asset keeps its own address and network. Existing `depositAddress`, `depositAsset`, and `network` values remain supported as a fallback for the asset they identify.

Registration creates an approved user account. Activity is always scoped to the authenticated account. Tokens expire according to `JWT_EXPIRES_IN`; passwords are stored as scrypt hashes with unique random salts. Suspended accounts cannot sign in. Admin credentials are provisioned from environment variables and are never accepted through public registration.

## System design

- **HTTP/API layer:** Node `http` server, bounded JSON request bodies, explicit CORS origin, bearer authentication, consistent JSON errors.
- **Domain:** accounts have `user` or `admin` roles and own balances/profile fields and activity records; the API returns only public account fields. Registration validates and normalizes email; account IDs and activity IDs are server generated. Admin-only routes list users and change account status.
- **Persistence:** account records are stored as documents in MongoDB's `users` collection.
- **Frontend boundary:** no frontend URL, fetch call, proxy, or environment variable was changed. Integrating the client can happen later against the documented routes.
- **Production evolution:** use a managed session/token store, rate limiting, email verification and password reset, admin audit logs, structured logging, TLS, secrets management, and operational backups before handling real accounts or funds.
