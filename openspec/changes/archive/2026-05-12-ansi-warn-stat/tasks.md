## 1. src/AnsiConverter.tsx

- [x] 1.1 Add `warns: number` field to the `stats` state initializer
- [x] 1.2 Add `warns: (raw.match(/\[33m/g) || []).length` to `updateStats`
- [x] 1.3 Add a `<div className="ansi-stat">` rendering `warns` between errors and infos in the stats bar

## 2. Verify

- [x] 2.1 Confirm the warns count appears and updates as input changes
