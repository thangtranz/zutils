## ADDED Requirements

### Requirement: HTTP Endpoints

The server SHALL expose four HTTP endpoints on the configured port (default `3000`, override via `PORT` env var):

- `GET /` — health/metadata
- `GET /api/live` — current queue depth
- `GET /api/metric` — CloudWatch metric timeseries
- `GET /api/compare` — multi-queue metric overlay

#### Scenario: Health endpoint

- **WHEN** a client sends `GET /`
- **THEN** the response is HTTP 200 with JSON `{ "name": "sqs-api-server", "version": "<package-version>" }`

#### Scenario: Unknown path

- **WHEN** a client sends a request to a path not listed above
- **THEN** the response is HTTP 404 with JSON `{ "error": "not found" }`

---

### Requirement: `GET /api/live` Contract

The endpoint SHALL accept `queue` (required), `profile` (optional), `region` (optional) query parameters and return current queue depth attributes.

#### Scenario: Missing queue parameter

- **WHEN** the request omits `queue`
- **THEN** the response is HTTP 400 with JSON `{ "error": "queue required" }`

#### Scenario: Successful live fetch

- **WHEN** the request includes a valid queue
- **THEN** the response is HTTP 200 with JSON `{ queue, url, visible, inFlight, delayed }` — all numeric counts pulled from `GetQueueAttributesCommand`

#### Scenario: Queue passed as URL

- **WHEN** `queue` is a full SQS URL
- **THEN** the URL is used directly without calling `GetQueueUrlCommand`; the response `queue` field is the last URL segment

---

### Requirement: `GET /api/metric` Contract

The endpoint SHALL accept `queue` (required), `metric` (default `NumberOfMessagesReceived`), `stat` (default `Sum`), `period` (default `300`), `start` (default `-1h`), `end` (default now), `profile` (optional), `region` (optional). It SHALL return a timeseries plus a summary.

#### Scenario: Successful metric fetch

- **WHEN** the request includes a valid queue
- **THEN** the response is HTTP 200 with JSON `{ queue, metric, stat, period, start, end, series: [{ t, v }, ...], summary: { points, sum, avg, max, min } }`

#### Scenario: Zero datapoints

- **WHEN** CloudWatch returns no datapoints for the window
- **THEN** the response is HTTP 200 with `series: []` and `summary: { points: 0 }` — no other summary fields

#### Scenario: Relative start parsing

- **WHEN** `start=-7d`
- **THEN** the resolved start time is 7 days before now (UTC); supported units are `s`, `m`, `h`, `d`

#### Scenario: Invalid time string

- **WHEN** `start` or `end` is non-empty and not parseable as ISO or relative
- **THEN** the response is HTTP 500 with JSON `{ error: "Invalid time: <value>", name: "Error" }`

---

### Requirement: `GET /api/compare` Contract

The endpoint SHALL accept `queues` (required, comma-separated list of 2+ queues) and the same metric/stat/period/start/end/profile/region params as `/api/metric`. It SHALL fan out CloudWatch calls in parallel and return one series per queue.

#### Scenario: Missing queues parameter

- **WHEN** the request omits `queues`
- **THEN** the response is HTTP 400 with JSON `{ "error": "queues required" }`

#### Scenario: Single-queue value in queues

- **WHEN** `queues=q1` (only one)
- **THEN** the response is HTTP 400 with JSON `{ "error": "queues requires at least 2" }`

#### Scenario: Successful compare fetch

- **WHEN** the request includes `queues=q1,q2,q3`
- **THEN** the response is HTTP 200 with JSON `{ metric, stat, period, start, end, series: [{ queue, points: [{ t, v }, ...], summary }, ...] }` where each `summary` has the same shape as `/api/metric`

#### Scenario: Partial failure across queues

- **WHEN** one of the queues errors (e.g., does not exist) while others succeed
- **THEN** the response is HTTP 500 with the first encountered error's `error` and `name` fields — the request is all-or-nothing

---

### Requirement: AWS Credential Chain

The server SHALL use the AWS SDK default credential chain (environment variables, shared credentials file, SSO, EC2/ECS metadata). When the request includes `profile`, the server SHALL use `fromIni({ profile })` for that request's clients.

#### Scenario: Default chain

- **WHEN** a request arrives with no `profile` parameter
- **THEN** the SQS and CloudWatch clients are constructed without explicit credentials and pick them up from the default chain

#### Scenario: Profile override

- **WHEN** a request includes `profile=prod`
- **THEN** the clients for that request load credentials via `fromIni({ profile: "prod" })`

#### Scenario: Region default

- **WHEN** a request omits `region` and `AWS_REGION` is unset in the server's environment
- **THEN** the clients are constructed with `region: "ap-southeast-1"`

---

### Requirement: CORS

The server SHALL include `Access-Control-Allow-Origin: *` on every response so the React app can call it from any local dev port and from the deployed GH-Pages origin.

#### Scenario: CORS header on API response

- **WHEN** any API endpoint responds
- **THEN** the response includes the header `Access-Control-Allow-Origin: *`

#### Scenario: Preflight `OPTIONS` request

- **WHEN** a browser sends `OPTIONS /api/metric` with CORS preflight headers
- **THEN** the response is HTTP 204 with `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, OPTIONS`, and `Access-Control-Allow-Headers: Content-Type`

---

### Requirement: Error Response Contract

The server SHALL return errors as JSON with `error` (message) and `name` (error class) fields. Validation errors use HTTP 400; SDK or runtime errors use HTTP 500.

#### Scenario: Validation error shape

- **WHEN** a required parameter is missing
- **THEN** the response is HTTP 400 with JSON `{ "error": "<param> required" }`

#### Scenario: SDK error shape

- **WHEN** the AWS SDK throws (e.g., `AccessDenied`)
- **THEN** the response is HTTP 500 with JSON `{ "error": "<sdk error message>", "name": "<error class name>" }`

---

### Requirement: Cacheability

The server SHALL set `Cache-Control: no-store` on every response so browsers and intermediaries do not cache potentially-stale queue metrics.

#### Scenario: no-store header present

- **WHEN** any endpoint responds
- **THEN** the response includes the header `Cache-Control: no-store`

---

### Requirement: Startup Logging

On startup, the server SHALL log the bound URL to stdout so the operator knows where it is listening.

#### Scenario: Startup log

- **WHEN** the server starts on port `3000`
- **THEN** stdout contains a line like `sqs-api-server: http://localhost:3000`
