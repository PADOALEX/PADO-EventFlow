<div align="center">

# PADO EventFlow

**Full-Stack Event Management Application**

React 19 · Vite 7 · ASP.NET Core Web API (.NET 10) · PostgreSQL · EF Core 10

![CI](https://github.com/PADOALEX/PADO-EventFlow/actions/workflows/ci.yml/badge.svg)

</div>

## Overview

EventFlow is a full-stack upgrade of a university React event manager. The original visual language and the `EventForm`, `EventFilters`, `EventStats`, `EventTable`, `EventRow`, and `Notification` components are preserved. Unlike the original browser-only prototype, **every event is persisted in PostgreSQL through real HTTP API requests**. There are no setTimeout-based fake server calls or localStorage event database.

### Features

- Create, view, edit, delete and complete events
- Event name, date, optional start time, location, description and status
- Server-side case-insensitive search, status filtering, date sorting and pagination (up to 100/page)
- Global event statistics independent of the currently selected filters
- Validation on both client and server, structured 400 responses, graceful 404/429/500 handling
- Explicit CORS allowlist, bounded request size, fixed-window rate limiting, EF parameterized queries
- DateOnly-based dates (no accidental timezone shifting of calendar dates)
- Browser-friendly loading, saving, error, empty and pagination states
- Tests: React Testing Library/Jest, xUnit, real-PostgreSQL API integration, Playwright browser smoke
- Docker Compose (React served by Nginx + .NET API + PostgreSQL), migration on container startup, GitHub Actions CI

## Run with Docker (recommended)

Prerequisites: Docker Engine or Docker Desktop with Compose.

```bash
cp .env.example .env
# Edit .env and set a strong POSTGRES_PASSWORD for your environment.
docker compose up --build -d
```

Open **http://localhost:8080**. API health is **http://localhost:5080/health**. PostgreSQL binds to `127.0.0.1:5432` (not publicly exposed). On initial API boot `ApplyMigrations=true` applies the included initial EF Core migration automatically, after the DB passes its readiness check.

```bash
docker compose logs -f api
docker compose down          # stop without deleting data
docker compose down -v       # delete local DB volume (destructive)
```

> The application has **no user accounts or authorization**. It is a single-workspace portfolio application intended for local development and controlled demos. Do **not** expose the API publicly as a multi-tenant service without adding authentication, authorization, and per-user data isolation. CORS and rate limiting do not replace authentication.

## Run without Docker

Prerequisites: .NET SDK **10**, Node.js **22+**, PostgreSQL **17+**.

1. Create a PostgreSQL database `eventflow` and user with privileges for that database.
2. Configure the API through environment variables (PowerShell example):

```powershell
$env:ConnectionStrings__Postgres = "Host=localhost;Port=5432;Database=eventflow;Username=eventflow;Password=YOUR_LOCAL_PASSWORD"
$env:AllowedOrigins = "http://localhost:5173"
$env:ApplyMigrations = "true"
dotnet run --project backend/Pado.EventFlow.Api --launch-profile http
```

3. In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to `http://localhost:5080`; you do **not** have to put a private secret or API key into client-side code. React and Nginx use same-origin `/api` paths by default.

### Database migrations

A checked-in `InitialCreate` EF migration defines the `events` table, constraints and indexes. To apply existing migrations via the app set `ApplyMigrations=true`; in environments with a controlled deployment process use `dotnet ef database update --project backend/Pado.EventFlow.Api` and leave `ApplyMigrations` unset.

To create a new migration, install `dotnet-ef` (matching EF Core 10) and run:

```bash
dotnet ef migrations add YourMigrationName --project backend/Pado.EventFlow.Api
```

## HTTP API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Process health (does not query DB) |
| GET | `/api/events` | Paginated filtered events |
| GET | `/api/events/stats` | Total, planned and completed counts |
| GET | `/api/events/{id}` | Event details (404 when missing) |
| POST | `/api/events` | Create (201 + Location) |
| PUT | `/api/events/{id}` | Update (200 or 404) |
| PATCH | `/api/events/{id}/complete` | Complete event (200 or 404) |
| DELETE | `/api/events/{id}` | Delete (204 or 404) |

List query parameters: `search`, `status=Planned|Completed`, `sort=date|name`, `direction=asc|desc`, `page=1`, `pageSize=10` (range 1–100). Search matches name or description using escaped case-insensitive SQL pattern matching. Invalid filters and invalid payloads return `400` with validation details.

Sample POST:

```json
{
  "name": "Unity Meetup",
  "description": "Short game development talks",
  "date": "2026-12-05",
  "startTime": "18:30:00",
  "location": "Lviv",
  "status": "Planned"
}
```

`date` is a date, not an instant. `startTime` is optional and has no implied timezone. Date and startTime are intentionally separate to preserve the source app's date-only workflow.

## Tests

```bash
cd frontend
npm ci
npm test
npm run build
```

For backend unit tests only:

```bash
dotnet test PADO.EventFlow.slnx --filter FullyQualifiedName~ValidationTests
```

For **real API integration tests**, create a disposable PostgreSQL DB and set `EVENTFLOW_TEST_CONNECTION` to its connection string, then:

```bash
dotnet test PADO.EventFlow.slnx --configuration Release
```

Integration tests intentionally require an explicit database connection; without it they fail with an explanatory error rather than silently passing. The GitHub Actions backend job provisions PostgreSQL 17 automatically. It also runs a complete API create → search → complete → delete round-trip.

Playwright end-to-end smoke test after `docker compose up -d --build`:

```bash
cd tests/e2e
npm install
npx playwright install chromium
npm test
```

GitHub Actions also runs this in a dedicated Docker-based end-to-end job.

## Repository structure

```text
PADO-EventFlow/
├─ frontend/                   React UI, Vite, Jest/RTL, Nginx
├─ backend/Pado.EventFlow.Api/ .NET 10 API, EF Core models and migrations
├─ tests/Pado.EventFlow.Api.Tests/  xUnit unit/integration tests
├─ tests/e2e/                 Playwright full-stack browser smoke test
├─ .github/workflows/ci.yml   Build, test and E2E checks
├─ compose.yaml               API + frontend + PostgreSQL
├─ .env.example               Local configuration template
└─ PADO.EventFlow.slnx         Solution
```

## Design notes and trade-offs

- This deliberately remains a lightweight monolith, rather than introducing CQRS/MediatR/Redis for a small event-manager exercise.
- The React form keeps the original layout and styling while adding a description and optional start time.
- Application state is sourced from API responses; `localStorage` is not an event database.
- Events use GUID identifiers. Sort ordering is stabilized with an ID tie-breaker.
- Browser UI has no access to DB passwords; container secrets stay server-side. `.env` files are ignored by Git.
- The rate limiter is per-IP and **not** a strong DoS mitigation or access control.
- Process-only `/health` intentionally does not certify database readiness; database readiness is handled separately by Compose.

## Origins

Rebuilt from `HTML-Test_fin.zip` → `HTML-Test/event-manager/`, a React lab project. The original components, CSS visual system, and interaction patterns were retained and extended. Previous simulated network requests, mock-event persistence and related mock-timer tests were replaced with real API connectivity and HTTP-aware tests.

## License

MIT — see [LICENSE](LICENSE).
