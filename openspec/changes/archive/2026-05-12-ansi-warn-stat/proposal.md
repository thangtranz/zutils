## Why

The ANSI Converter stats bar shows error and info counts but silently ignores warning-level log lines (`[33m`), giving an incomplete picture of log health at a glance.

## What Changes

- The `stats` state shape gains a `warns` field
- `updateStats` counts `[33m` occurrences alongside errors and infos
- The stats bar renders a new "warnings" stat between errors and infos

## Capabilities

### New Capabilities
- `warn-stat`: Displays a count of warning-level log lines in the stats bar

### Modified Capabilities

## Impact

- `src/AnsiConverter.tsx`: Add `warns` to stats state, computation, and render
