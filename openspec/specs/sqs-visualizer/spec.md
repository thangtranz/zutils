## ADDED Requirements

### Requirement: Module Navigation Entry

The system SHALL expose the SQS Visualizer as a sidebar nav entry in `App.tsx`, alongside PagerDuty Calendar and ANSI Converter.

#### Scenario: Nav entry visible on load

- **WHEN** the user opens zutils
- **THEN** the sidebar shows an "SQS Visualizer" entry (with an icon) and clicking it renders the SQS Visualizer module in the main content area

#### Scenario: Active nav style

- **WHEN** the user is on the SQS Visualizer tab
- **THEN** the nav entry shows the active highlight (left border + active background) consistent with the other modules

---

### Requirement: Queue Input

The system SHALL accept a queue identifier in two forms: a queue name (e.g., `my-queue`) or a full SQS URL (e.g., `https://sqs.us-east-1.amazonaws.com/123456789012/my-queue`). In Compare mode, the input MUST accept a comma-separated list of two or more identifiers.

#### Scenario: Queue name entered

- **WHEN** the user types `my-queue` into the queue field and submits
- **THEN** the request is sent with `queue=my-queue` and the server resolves the URL via `GetQueueUrlCommand`

#### Scenario: Full queue URL entered

- **WHEN** the user pastes `https://sqs.../my-queue` into the queue field and submits
- **THEN** the URL is sent as-is; the queue name is derived for display by taking the last URL segment

#### Scenario: Compare mode comma list

- **WHEN** the user is in Compare mode and enters `q1,q2,q3` into the queue field
- **THEN** the request is sent to `/api/compare` with `queues=q1,q2,q3` and the response renders three series

#### Scenario: Compare mode with one queue

- **WHEN** the user is in Compare mode and enters only one queue
- **THEN** the form shows a validation message ("Compare mode needs at least 2 queues") and no fetch is made

---

### Requirement: Mode Selector

The system SHALL offer four modes via a dropdown: Live, Timeseries, Total, Compare. The visible form controls and the chosen API endpoint depend on the selected mode.

#### Scenario: Live mode controls

- **WHEN** the user selects Live mode
- **THEN** the form hides metric, stat, period, start, and end inputs; only queue, profile, and region remain visible

#### Scenario: Timeseries mode controls

- **WHEN** the user selects Timeseries mode
- **THEN** the form shows queue, profile, region, metric, stat, period, start, end

#### Scenario: Total mode controls

- **WHEN** the user selects Total mode
- **THEN** the form shows the same controls as Timeseries; the result renders summary cards only (no chart)

#### Scenario: Compare mode controls

- **WHEN** the user selects Compare mode
- **THEN** the queue field label changes to "Queues (comma-separated)" and the form is otherwise identical to Timeseries

---

### Requirement: Live Depth View

The system SHALL fetch and display the current queue depth — visible, in-flight, and delayed message counts — when Live mode is run.

#### Scenario: Live depth rendered

- **WHEN** the user runs Live mode against a real queue
- **THEN** the result panel shows three counters (Visible, In-flight, Delayed) and the queue's full URL

#### Scenario: Live counters formatted

- **WHEN** the counters render
- **THEN** numbers use locale formatting (thousand separators) for readability

---

### Requirement: Timeseries Chart

The system SHALL render an SVG line/area chart of the metric over the selected window, with axes, gridlines, and axis labels. The chart MUST be self-contained (no external chart library).

#### Scenario: Chart rendered with datapoints

- **WHEN** the metric request returns 1 or more datapoints
- **THEN** an SVG chart renders with a line connecting the points, a translucent area fill, a Y-axis with 5 gridlines and labels, and an X-axis with up to 6 time ticks

#### Scenario: X-axis format adapts to window length

- **WHEN** the window spans more than 24 hours
- **THEN** X-axis ticks render as `MM/DD HH:MM` (UTC); otherwise as `HH:MM` (UTC) with the date shown once in the X-axis label

#### Scenario: Y-axis unit label

- **WHEN** the metric is `ApproximateAgeOfOldestMessage`
- **THEN** the Y-axis label reads `<stat> · seconds`; otherwise it reads `<stat> · messages`

#### Scenario: No datapoints

- **WHEN** the metric request returns zero datapoints
- **THEN** the result panel shows "No datapoints." instead of a chart

#### Scenario: Datapoint table below chart

- **WHEN** the chart renders
- **THEN** a table of timestamp/value rows renders below it (one row per datapoint)

---

### Requirement: Total Aggregate View

The system SHALL display summary cards (Sum, Avg/pt, Max/pt, Min/pt) over the requested window, with no chart and no datapoint table.

#### Scenario: Total summary rendered

- **WHEN** the user runs Total mode against a queue
- **THEN** four summary cards render with the aggregated values for the chosen metric/stat across the window

#### Scenario: Total window header

- **WHEN** the result renders
- **THEN** a header shows the queue name, metric, stat, full window (start → end), period, and point count

---

### Requirement: Multi-Queue Compare View

The system SHALL fetch metrics for two or more queues using the same metric/stat/period/window and overlay them on a single SVG chart with color-coded series and a legend.

#### Scenario: Compare chart with multiple queues

- **WHEN** the user runs Compare mode with `q1,q2,q3`
- **THEN** the result renders one SVG chart with three lines (distinct colors), a legend listing each queue with its color swatch, and a per-queue summary row (Sum / Avg / Max / Min)

#### Scenario: Compare chart axis scaling

- **WHEN** the queues have different magnitudes
- **THEN** the Y-axis is scaled to the overall min/max across all series so every line is visible

#### Scenario: Compare with one or more queues returning empty

- **WHEN** at least one queue returns zero datapoints
- **THEN** that queue's row in the legend is marked "(no data)" and no line is drawn for it; other queues render normally

---

### Requirement: Form Controls and Defaults

The form SHALL expose: queue(s), AWS profile (optional, free text), AWS region (default `ap-southeast-1`), metric (6-option dropdown), stat (Sum/Average/Maximum/Minimum), period (number, seconds, min 60, step 60), start (free text — ISO or relative like `-1h` or `-7d`, default `-1h`), end (free text — ISO or empty for now).

#### Scenario: Metric dropdown options

- **WHEN** the user opens the metric dropdown
- **THEN** the options are exactly: `NumberOfMessagesReceived`, `NumberOfMessagesSent`, `NumberOfMessagesDeleted`, `ApproximateNumberOfMessagesVisible`, `ApproximateNumberOfMessagesNotVisible`, `ApproximateAgeOfOldestMessage`

#### Scenario: Stat dropdown options

- **WHEN** the user opens the stat dropdown
- **THEN** the options are exactly: `Sum`, `Average`, `Maximum`, `Minimum`

#### Scenario: Default start value

- **WHEN** the module first renders
- **THEN** the start field is pre-filled with `-1h`

#### Scenario: Default region

- **WHEN** the region field is empty
- **THEN** requests are sent without `region` and the server defaults to `ap-southeast-1`

---

### Requirement: API Base URL Configuration

The React module SHALL read the API base URL from `process.env.REACT_APP_SQS_API_BASE_URL` at build time, falling back to `http://localhost:3000`. The active value MUST be visible to the user.

#### Scenario: Default API base URL

- **WHEN** `REACT_APP_SQS_API_BASE_URL` is not set at build time
- **THEN** requests go to `http://localhost:3000`

#### Scenario: API URL badge in header

- **WHEN** the SQS Visualizer tab is open
- **THEN** the tab header displays the resolved API base URL as a small badge so the user can verify which endpoint they are calling

---

### Requirement: Server Unavailable Handling

When a fetch fails due to network error or non-2xx response, the system SHALL display an actionable error message naming the configured API base URL and the command to start the server.

#### Scenario: Network error (server not running)

- **WHEN** the fetch throws a network error
- **THEN** the result panel shows: `Can't reach the server at <API_BASE_URL>. Start it with \`npm run server\` from the zutils repo.`

#### Scenario: Server returns 4xx/5xx

- **WHEN** the fetch returns a non-2xx response
- **THEN** the result panel shows the response body's `error` field (if present) inside a red-bordered error box; otherwise the HTTP status text

---

### Requirement: Theme Integration

The module SHALL respect the active zutils theme (light/dark) by using CSS variables from `ThemeContext`, including for chart line/area colors.

#### Scenario: Theme switch updates chart

- **WHEN** the user toggles theme while the chart is visible
- **THEN** chart line/area colors, axis colors, and background re-render in the new theme without re-fetching data
