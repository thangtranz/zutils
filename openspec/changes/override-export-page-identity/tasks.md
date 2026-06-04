## 1. Track the loaded file name

- [x] 1.1 Add `const [fileName, setFileName] = useState("")` in `src/MdToPdf.tsx`
- [x] 1.2 Set `setFileName(file.name)` in `loadFile`

## 2. Override / restore helper

- [x] 2.1 Add `overridePageIdentity()` in `exportPdf` that snapshots `document.title` and `location.href`
- [x] 2.2 Set `document.title = fileName.replace(/\.(md|markdown)$/i, "") || " "`
- [x] 2.3 Set the URL to `" "` via `history.replaceState(history.state, "", " ")`, wrapped in `try/catch`
- [x] 2.4 Return a restore closure that puts the original title and URL back (also `try/catch` on `replaceState`)
- [x] 2.5 Declare a `let restorePageIdentity = () => {}` no-op default

## 3. Wire into both print paths

- [x] 3.1 Call `restorePageIdentity = overridePageIdentity()` immediately before the Paged.js path `window.print()`
- [x] 3.2 Call `restorePageIdentity = overridePageIdentity()` immediately before the native-fallback `window.print()`
- [x] 3.3 Call `restorePageIdentity()` in the Paged.js `cleanup` (`afterprint`)
- [x] 3.4 Call `restorePageIdentity()` in the fallback `fbCleanup` (`afterprint`)
- [x] 3.5 Add `fileName` to the `exportPdf` `useCallback` dependency array

## 4. Verification

- [x] 4.1 `npm run build` succeeds with no type errors and no new dependency added
- [ ] 4.2 Load a file named `roadmap.md`, export, and confirm the print dialog's default filename is `roadmap` (saves `roadmap.pdf`)
- [ ] 4.3 With no file loaded (seeded sample), export and confirm the title is blank (`" "`), not "ZUtils"
- [ ] 4.4 With the browser's "Headers and footers" print option enabled (or via the native fallback path), confirm the stamped header shows the file name / blank title and a blank URL, not "ZUtils" + the app URL
- [ ] 4.5 After the print dialog closes, confirm `document.title` and the address-bar URL are restored to their pre-export values on both the Paged.js and fallback paths
