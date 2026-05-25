## Why

Inspecting SQS queue health currently means jumping between AWS Console, ad-hoc `aws cloudwatch get-metric-statistics` calls, or running the standalone `sqs-analyze` CLI in a separate repo. zutils already hosts companion ops tools (PagerDuty calendar, ANSI converter); folding SQS visualization in centralizes them and removes the per-tool context switch. It also lets us add multi-queue compare — a view sqs-analyze does not offer.

## What Changes

- Add a new `SQS Visualizer` module accessible from the zutils sidebar (third nav entry after PagerDuty and ANSI).
- Port `sqs-analyze`'s Node code (`index.js`, `server.js`) into a new `server/` directory at the zutils repo root. The server keeps its existing `/api/live` and `/api/metric` endpoints and adds a new `/api/compare` endpoint.
- Strip the embedded HTML from `server.js` — the UI moves to the React module.
- Add CORS headers to the server so the React dev server (and GH-Pages-hosted UI) can call it.
- Add an `npm run server` script at repo root that delegates to the `server/` workspace.
- React module supports four modes: live depth, timeseries chart, total aggregate, multi-queue compare.
- API base URL is configurable (default `http://localhost:3000`); show an actionable hint when the server is unreachable.
- AWS SDK dependencies live only under `server/package.json` — the GH-Pages bundle stays free of them.

## Capabilities

### New Capabilities

- `sqs-visualizer`: Browser UI for viewing SQS queue depth and CloudWatch metrics. Covers form inputs, four view modes (live / timeseries / total / compare), chart rendering, theme integration, and server-unavailable handling.
- `sqs-api-server`: Local Node HTTP service that wraps AWS SQS + CloudWatch SDK calls. Covers endpoints, AWS credential chain, error contract, CORS, and the new `/api/compare` shape.

### Modified Capabilities

None.

## Impact

- New directory `server/` at repo root (Node ES modules, AWS SDK v3, separate `package.json`).
- New file `src/SqsVisualizer.tsx`.
- Modified `src/App.tsx` — add nav entry and route.
- Modified root `package.json` — add `server` script.
- Modified `README.md` — server run instructions and API base URL config.
- New runtime dependency: user must run `node server/server.js` locally to fetch data. GH-Pages-hosted UI shows a "server not running" hint when fetch fails — feature is functional only when the server is reachable.
- Upstream `sqs-analyze` becomes redundant once this lands and can be deprecated.
