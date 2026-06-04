## MODIFIED Requirements

### Requirement: Print Footer

The exported PDF MUST show a custom footer on every page, rendered via `@page` margin boxes, and MUST NOT show the browser's default print header or footer (page title, date, or URL). To control what the browser stamps when it does draw a header/footer (the native-print fallback path, which has no `@page` margin boxes, and the case where the user has the browser's header/footer option enabled), the export MUST override `document.title` and the page URL for the duration of printing and restore both afterward. The title MUST be set to the loaded Markdown file's name with a trailing `.md`/`.markdown` extension removed, falling back to a single space `" "` when no file has been loaded (so the global app title is never shown). The page URL MUST be blanked to a single space `" "`. The override MUST be applied immediately before printing and the original title and URL MUST be restored on `afterprint`, in both the Paged.js pagination path and the native-print fallback path.

#### Scenario: Export timestamp bottom-left

- **WHEN** a document is exported
- **THEN** the bottom-left of every page shows the export timestamp in local time formatted as `YYYY-MM-DD HH:MM`

#### Scenario: Page numbers bottom-right

- **WHEN** a document is exported
- **THEN** the bottom-right of every page shows `Page X of Y`, where `X` is the current page and `Y` is the total page count

#### Scenario: No browser-injected header/footer

- **WHEN** the document prints via the Paged.js path
- **THEN** no browser-drawn header or footer (document title, date, or page URL) appears, because Paged.js controls the page boxes

#### Scenario: PDF named after the loaded file

- **WHEN** a Markdown file named `roadmap.md` has been loaded and the user exports
- **THEN** `document.title` is set to `roadmap` (the `.md`/`.markdown` extension stripped) so the print dialog's default save filename is `roadmap`

#### Scenario: Title blanked when no file is loaded

- **WHEN** the user exports with no file loaded (the seeded sample or hand-typed source)
- **THEN** `document.title` is set to a single space `" "` so the global "ZUtils" app title is not used as the PDF name or stamped into a browser header

#### Scenario: Page URL blanked during export

- **WHEN** the document prints and the browser stamps a header/footer (native fallback path, or the browser's header/footer option enabled)
- **THEN** the page URL has been blanked to `" "` so the app URL is not stamped onto the page

#### Scenario: Title and URL restored after printing

- **WHEN** the print dialog is closed (or the export errors), on either the Paged.js or native-fallback path
- **THEN** the original `document.title` and page URL are restored to their pre-export values
