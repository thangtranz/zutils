## Context

`exportPdf` in `src/MdToPdf.tsx` prints by triggering `window.print()` — twice over two paths:

1. **Paged.js path:** clone the preview, paginate into an off-screen `#mdp-paged` target, then print. Paged.js renders a custom footer via `@page` margin boxes.
2. **Native fallback path** (`nativePrintFallback`): when Paged.js's break-token walk throws, print the preview clone directly. There are **no** `@page` margin boxes here.

In both paths the browser's print dialog uses `document.title` as the default save filename, and — when the browser's "Headers and footers" print option is on (and always in the fallback path, which has no Paged.js boxes) — stamps `document.title` and the page URL across each page. The app title is "ZUtils" and the URL is the app URL, neither of which belongs on the exported document.

The tool already loads `.md`/`.markdown` files via `loadFile`, but it discarded the file name — only the text was kept in `source`.

## Goals / Non-Goals

**Goals:**

- Name the exported PDF after the loaded Markdown document (extension stripped) instead of "ZUtils".
- Blank the page URL during printing so it is not stamped into the browser header/footer.
- Blank the title (`" "`) when there is no loaded file, so it never shows "ZUtils".
- Restore the real title and URL after printing, on every path, including on error.

**Non-Goals:**

- Deriving a name from hand-typed source (e.g. the first `# heading`). Only the loaded file name is used; otherwise the title is blanked. Revisit later if wanted.
- Changing the Paged.js custom footer (timestamp + page numbers) — unaffected.
- Persisting or displaying the file name elsewhere in the UI.

## Decisions

### Track the loaded file name in state

Add `const [fileName, setFileName] = useState("")` and set it in `loadFile` from `file.name`. State (not a ref) so the value is current when `exportPdf` runs; `exportPdf` lists `fileName` in its dependency array.

### One helper that overrides and returns its own restore

`overridePageIdentity()` snapshots `document.title` and `location.href`, applies the overrides, and returns a `restore` closure. This keeps the saved values local to each invocation and makes restore symmetric with override:

```
document.title = fileName.replace(/\.(md|markdown)$/i, "") || " ";
history.replaceState(history.state, "", " ");   // wrapped in try/catch
```

- **Title:** the file name with a trailing `.md`/`.markdown` stripped (case-insensitive) so the dialog defaults to `name.pdf`, not `name.md.pdf`. Empty string (no file loaded) falls back to `" "` — a space rather than empty, so the browser does not substitute its own default.
- **URL:** set to `" "` via `history.replaceState`, preserving `history.state`. Wrapped in `try/catch` because some origins reject `replaceState`; on failure the title override still applies.

### Override late, restore on afterprint, both paths

The override is applied immediately before each `window.print()` call and the returned restore is run inside the matching `afterprint` cleanup (`cleanup` for the Paged.js path, `fbCleanup` for the fallback). A `let restorePageIdentity = () => {}` no-op default means the cleanup closures can call it unconditionally even before an override has run (e.g. the Paged.js `cleanup()` invoked from the `catch` before the fallback sets its own override).

## Risks / Trade-offs

- **Trade-off:** browser header/footer suppression is still ultimately the user's print-dialog setting; this change controls *what* is stamped (file name, blank URL) rather than forcing headers off. Combined with the Paged.js `@page` boxes, the common path shows the custom footer only; the fallback path now shows the file name and a blank URL instead of "ZUtils" + app URL. Accepted.
- **Risk (low):** `history.replaceState(_, _, " ")` resolves the URL relative to the current document; the address bar briefly shows the resolved path during printing. It is restored on `afterprint`, and the `try/catch` guards origins that reject it.

## Migration Plan

Additive within the existing tool. No data, flags, or dependency changes. Rollback: revert the diff.

## Open Questions

None blocking. Possible later iteration: derive a title from the first Markdown heading when no file is loaded, instead of blanking it.
