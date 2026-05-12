# warn-stat Specification

## Purpose
TBD - created by archiving change ansi-warn-stat. Update Purpose after archive.
## Requirements
### Requirement: Warn Count Display

The stats bar MUST count and display the number of warning-level log lines detected in the input.

#### Scenario: Input contains warning lines

- **WHEN** the user pastes or loads ANSI log text containing `[33m` escape sequences
- **THEN** the stats bar displays a "warns" count equal to the number of `[33m` occurrences
- **AND** the count updates in real time as the input changes

#### Scenario: Input has no warnings

- **WHEN** the input contains no `[33m` escape sequences
- **THEN** the warns count displays `0`

