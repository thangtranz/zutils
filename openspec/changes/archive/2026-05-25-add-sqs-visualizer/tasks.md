## 1. Server Port

- [x] 1.1 Create `server/` directory at repo root
- [x] 1.2 Add `server/package.json` (`type: module`, deps: `@aws-sdk/client-sqs`, `@aws-sdk/client-cloudwatch`, `@aws-sdk/credential-providers`; `scripts.start = node server.js`)
- [x] 1.3 Copy `sqs-analyze/index.js` → `server/sqs.js`, keep the `parseTime` / `buildClientConfig` / `isUrl` / `resolveQueueUrl` / `queueNameFromAny` / `getLive` / `getMetric` exports
- [x] 1.4 Copy `sqs-analyze/server.js` → `server/server.js`, remove the embedded `HTML` template literal and the `GET /` HTML response
- [x] 1.5 Replace the `GET /` handler with health JSON `{ name: "sqs-api-server", version }` (read version from `server/package.json`)
- [x] 1.6 Add a CORS helper: write `Access-Control-Allow-Origin: *` and `Cache-Control: no-store` on every response; handle `OPTIONS` preflight with 204 + `Access-Control-Allow-Methods: GET, OPTIONS` and `Access-Control-Allow-Headers: Content-Type`
- [x] 1.7 Add `handleCompare(params)`: validate `queues` (comma-list, ≥2), `Promise.all` over `getMetric`, shape response as `{ metric, stat, period, start, end, series: [{ queue, points, summary }] }`
- [x] 1.8 Wire `GET /api/compare` to `handleCompare`
- [x] 1.9 Update startup log to print `sqs-api-server: http://localhost:${PORT}`
- [x] 1.10 Run `cd server && npm install` and confirm `npm start` boots on :3000

## 2. Root Package Wiring

- [x] 2.1 Add `scripts.server` to root `package.json`: `"server": "cd server && npm start"`
- [x] 2.2 Add `.gitignore` entry for `server/node_modules` if not already covered
- [x] 2.3 Verify root `npm run build` still passes and `build/static/js/*.js` contains no AWS SDK shapes (`grep -c "QueueUrl" build/static/js/*.js` should be 0)

## 3. React Module Skeleton

- [x] 3.1 Create `src/SqsVisualizer.tsx` with default export and a placeholder body
- [x] 3.2 Add a `useTheme()` consumer so colors come from CSS variables already defined in `src/styles.css` / `ThemeContext`
- [x] 3.3 Read `process.env.REACT_APP_SQS_API_BASE_URL` (fallback `http://localhost:3000`) into a module-level constant
- [x] 3.4 Add a tab header that shows the title and the resolved API base URL as a small badge
- [x] 3.5 Wire `SqsVisualizer` into `src/App.tsx` `NAV_ITEMS` (new id `"sqs"`, label `"SQS Visualizer"`, icon `"📊"`) and render it from the `<main>` switch

## 4. Form Controls

- [x] 4.1 Add form state: `queue`, `mode` (`live` | `timeseries` | `total` | `compare`), `profile`, `region`, `metric`, `stat`, `period`, `start`, `end`
- [x] 4.2 Add mode dropdown (4 options) — Timeseries is the default
- [x] 4.3 Add metric dropdown with exactly the 6 options from the spec
- [x] 4.4 Add stat dropdown (Sum/Average/Maximum/Minimum)
- [x] 4.5 Add period number input (min 60, step 60, default 300)
- [x] 4.6 Add start (default `-1h`) and end (placeholder `now`) text inputs
- [x] 4.7 Hide metric/stat/period/start/end inputs when mode is `live`
- [x] 4.8 In Compare mode, change queue label to "Queues (comma-separated)" and validate that ≥2 queues are entered before submit

## 5. Fetch Layer

- [x] 5.1 Add `buildQs(data, keep)` helper that drops empty fields
- [x] 5.2 Add `fetchLive`, `fetchMetric`, `fetchCompare` helpers that call the right endpoint and throw on non-2xx with the response body's `error`
- [x] 5.3 On submit, set `loading=true`, call the right helper, store result in state, set `loading=false`
- [x] 5.4 On network failure (TypeError from fetch), set `error` state to the user-facing "Can't reach the server at <API_BASE_URL>..." message

## 6. Result Views

- [x] 6.1 Build `LiveView`: render Visible / In-flight / Delayed cards with locale-formatted numbers; show queue name and full URL
- [x] 6.2 Port the SVG `chart()` function from `sqs-analyze/server.js` into a `Chart` TSX component (single-series). Use the same path/area/axis math; pull colors from CSS variables.
- [x] 6.3 Build `TimeseriesView`: header (queue / metric / stat / window / period / point count), `Chart`, datapoint table
- [x] 6.4 Build `TotalView`: same header + 4 summary cards (Sum / Avg/pt / Max/pt / Min/pt); no chart, no table
- [x] 6.5 Extend `Chart` to support multiple series with distinct colors (predefined palette) and a legend; auto-scale Y to overall min/max
- [x] 6.6 Build `CompareView`: multi-series chart + per-queue summary rows; legend marks any queue with no data as "(no data)"

## 7. Error & Empty States

- [x] 7.1 Render "No datapoints." in timeseries/total when `summary.points === 0`
- [x] 7.2 Render the server-down message inside a red-bordered box when network error
- [x] 7.3 Render server-supplied error message inside the same red-bordered box for non-2xx responses

## 8. README + Verification

- [x] 8.1 Add "SQS Visualizer" section to root `README.md`: how to start the server (`npm run server`), AWS auth note (default credential chain), how to override `REACT_APP_SQS_API_BASE_URL`
- [x] 8.2 Start both servers and smoke-test against a real queue: Live, Timeseries (1h), Total (24h), Compare (2+ queues)
- [x] 8.3 Confirm output matches `node sqs-analyze/index.js` CLI for the same inputs
- [x] 8.4 Stop the API server, reload UI, confirm the "Can't reach the server..." message appears
- [x] 8.5 Toggle light/dark theme with a chart visible; confirm colors update without a re-fetch
- [x] 8.6 `npm run build` succeeds; `grep -c "QueueUrl" build/static/js/*.js` returns 0
