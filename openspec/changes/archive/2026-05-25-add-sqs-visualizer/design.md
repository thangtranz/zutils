## Context

zutils is a browser-only React/TypeScript app deployed to GitHub Pages (`react-scripts build` + `gh-pages -d build`). Existing modules (PagerDuty Calendar, ANSI Converter) operate entirely client-side on user-supplied files. They have no backend.

The companion project `sqs-analyze` is a Node CLI plus a small HTTP server that wraps AWS SDK v3 (`@aws-sdk/client-sqs`, `@aws-sdk/client-cloudwatch`). It exposes `GET /api/live` and `GET /api/metric`, and bakes its own UI into a single embedded HTML string. AWS credentials come from the default SDK credential chain (env, `~/.aws/credentials`, SSO) and can be overridden with `--profile` / `?profile=`.

Folding it into zutils means crossing the browser-only boundary for the first time. The user has chosen to port the Node code into the zutils repo (hybrid app) rather than calling AWS from the browser or running an external service.

## Goals / Non-Goals

**Goals:**

- Centralize the SQS visualization tool under the zutils sidebar alongside PagerDuty/ANSI.
- Preserve sqs-analyze's existing behavior for `/api/live` and `/api/metric` so any current callers keep working.
- Add a new multi-queue compare view (overlay several queues' metrics on one chart).
- Keep AWS SDK out of the browser bundle (so GH-Pages deploy stays static and bundle stays small).
- Keep credentials handling unchanged from sqs-analyze (default chain on the local machine, never sent from the browser).
- Make the React module degrade clearly when the server is not running.

**Non-Goals:**

- Hosting the server anywhere (Lambda, ECS, container). It runs locally on the user's machine.
- Single-command startup that boots both React and the server. They start in two terminals.
- Cost dashboards, message-body sampling, queue redrive, dead-letter inspection, or any non-metric features.
- Auth/authorization on the server (it binds to localhost and reuses the local AWS chain — same trust model as the upstream CLI).
- Replacing or modifying the existing zutils tabs.

## Decisions

### Repo layout: `server/` sibling to `src/`

The Node code lives under `server/` at the repo root, with its own `package.json` (`type: "module"`). The root `package.json` adds an `npm run server` script that delegates (`cd server && npm start`). React-side `package.json` does not list AWS SDK packages.

**Alternative considered:** mixing AWS SDK deps into the root `package.json` and gating with `process.env` checks. Rejected — `react-scripts build` would tree-shake imperfectly and risk pulling SDK shapes into the client bundle, plus npm install on GH-Pages CI would pull unneeded deps.

### Port via copy, not git submodule or workspace

Copy `sqs-analyze/index.js` → `server/sqs.js` and `sqs-analyze/server.js` → `server/server.js`, strip the embedded HTML from the latter, and add CORS + the new `/api/compare` endpoint. No submodule, no npm workspace pointer.

**Rationale:** sqs-analyze is small (~180 LOC). A copy is simpler than coupling two repos, and the upstream project becomes deprecated once this lands. Keeps the zutils repo self-contained.

### API base URL configurable, default `http://localhost:3000`

The React module reads `process.env.REACT_APP_SQS_API_BASE_URL || "http://localhost:3000"` at build time and exposes the value in the form (read-only badge) so the user knows what URL it is hitting.

**Alternative:** hardcode `http://localhost:3000`. Rejected — at least one user may run the server on a different host/port (e.g., a remote bastion) and rebinding ports is fine, but rebuilding zutils every time is not.

### `/api/compare` shape

```
GET /api/compare?queues=q1,q2,q3&metric=...&stat=...&period=...&start=...&end=...&profile=...&region=...
```

Response:

```json
{
  "metric": "NumberOfMessagesReceived",
  "stat": "Sum",
  "period": 300,
  "start": "...",
  "end": "...",
  "series": [
    { "queue": "q1", "points": [{ "t": "...", "v": 0 }, ...], "summary": { ... } },
    { "queue": "q2", "points": [...], "summary": { ... } }
  ]
}
```

Server fans out to `getMetric` in parallel (`Promise.all`). All queues share one window/period/metric/stat to keep the comparison meaningful.

**Alternative:** force the client to make N separate `/api/metric` calls. Rejected — server-side fan-out gives one error contract and one consistent timestamp grid.

### Live depth refresh is manual

The Live view does not auto-refresh. User clicks Run to re-fetch.

**Rationale:** the upstream CLI runs once and exits; matching that mental model avoids surprise polling costs. A future iteration can add an auto-refresh toggle.

### Chart rendering: port the existing SVG path from sqs-analyze

The chart logic in `sqs-analyze/server.js` (the `chart()` function in the embedded HTML) is small and dependency-free. Port it to a `Chart.tsx` (or inline within `SqsVisualizer.tsx`) as a TS function that returns JSX. No chart library.

**Alternative:** Recharts / visx. Rejected — adds 50–200 KB to the client bundle for a feature that already works at ~80 LOC of math.

For Compare mode, extend the same routine: multiple `<path>` elements with distinct colors, plus a legend.

### Theme: piggyback on `ThemeContext`

Read `useTheme()` and use existing CSS variables (`--bg-main`, `--text-primary`, etc.). No new theme tokens.

### CORS: open in dev, document the trust model

Server sets `Access-Control-Allow-Origin: *`. This is acceptable because (a) it only serves wrappers around the user's own AWS chain, and (b) it binds to localhost by default. Documented in README.

**Alternative:** restrict to `http://localhost:3001` (CRA dev) and the GH-Pages origin. Rejected — too brittle; users may run the React app on any port, and the security gain is illusory while the server is on localhost.

### Server-down UX

On fetch failure (network error or non-2xx), the result panel shows a fixed message:

> Can't reach the server at `<API_BASE_URL>`. Start it with `npm run server` from the zutils repo.

This is the only place the user is told to run the server in-app; otherwise the README carries the instructions.

## Risks / Trade-offs

- **Risk:** users hit GH-Pages-hosted zutils and don't realize they need a local server → [Mitigation] explicit server-down message + README note + a small badge in the SQS Visualizer tab header showing API base URL and reachable status.
- **Risk:** CORS open to `*` invites concerns → [Mitigation] document that the server binds to localhost and serves only the user's own credentials; this is the same trust model as running the CLI.
- **Risk:** porting drift — sqs-analyze gets a fix and zutils misses it → [Mitigation] mark `sqs-analyze` as deprecated in this proposal's Impact section; treat zutils as the canonical home going forward.
- **Risk:** AWS SDK accidentally bundled into React via shared imports → [Mitigation] keep AWS SDK in `server/package.json` only; verify with `grep "QueueUrl" build/static/js/*.js` post-build (should be empty).
- **Trade-off:** no automatic refresh → users polling status must click Run repeatedly. Accepted for v1.
- **Trade-off:** compare mode forces all queues onto one period/window → users wanting different windows per queue must run separate Timeseries fetches. Accepted — keeps the chart legible.

## Migration Plan

1. Land this change behind no flag — feature is purely additive.
2. After ship, update `sqs-analyze/README.md` with a "moved to zutils" note (out of scope for this PR but tracked).
3. No data migration; the React module holds no persisted state beyond form inputs.

Rollback: revert the PR. No external state to clean up.

## Open Questions

None blocking. Items the next iteration can address:

- Persist last-used queue list in `localStorage`.
- Auto-refresh toggle for Live mode (e.g., every 10s).
- Export chart data as CSV (parallel to PagerDuty's export pattern).
