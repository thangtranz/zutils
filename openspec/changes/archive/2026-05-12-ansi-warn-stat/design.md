## Context

`AnsiConverter.tsx` has a `stats` state object with `lines`, `errors`, `infos`, and `size` fields. The `updateStats` callback populates it via regex matches on the raw ANSI input. The stats bar renders each field as a `<div className="ansi-stat">`.

## Goals / Non-Goals

**Goals:**
- Add `warns` count that mirrors the existing `errors`/`infos` pattern

**Non-Goals:**
- Changing the visual style of the stats bar
- Counting other severity levels (debug, trace, etc.)

## Decisions

### Decision 1: Use the same regex-count pattern as errors/infos

Match `[33m` occurrences with `(raw.match(/\[33m/g) || []).length` — identical approach to existing counts. No abstraction needed for three fields.

## Risks / Trade-offs

- Regex counts occurrences of the escape code, not logical lines — consistent with how errors/infos are counted today.
