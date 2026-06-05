## ADDED Requirements

### Requirement: Wide Content Fit on Export

The export MUST ensure that content wider than the page — code blocks and tables — is fit within the A4 content box rather than being clipped, so no content is lost in the exported PDF. Because a PDF page cannot scroll, the tool MUST fit such content to the page width on export by wrapping and/or down-scaling. Scaling MUST preserve aspect ratio, MUST NOT upscale content that already fits, and MUST keep code line-number gutters aligned with their code lines. To avoid unreadably small text on extreme widths, scaling MUST NOT shrink below a minimum scale factor (≈50%); content that still does not fit at the minimum scale MAY remain clipped (accepted for pathological widths). This behavior applies to the export only; the on-screen preview retains its horizontal-scroll behavior.

#### Scenario: Wide code block is not clipped

- **WHEN** a fenced code block contains lines wider than the page content width and the document is exported
- **THEN** the block is scaled down uniformly so its widest line fits within the page, and no characters are cut off at the page edge

#### Scenario: Code block line numbers stay aligned when scaled

- **WHEN** a code block with a line-number gutter is scaled to fit on export
- **THEN** each line number remains aligned with its code line (the gutter scales with the code, not independently)

#### Scenario: Narrow code block is unchanged

- **WHEN** a code block already fits within the page content width
- **THEN** it is not scaled (no upscaling) and renders at the normal export font size

#### Scenario: Scaling stops at the minimum scale floor

- **WHEN** a code block is so wide that fitting it would require shrinking below the minimum scale factor (≈50%)
- **THEN** it is scaled only to the floor (not smaller), keeping the text readable, and any remaining overflow may be clipped

#### Scenario: Table with long unbreakable content fits the page

- **WHEN** a table cell contains a long unbreakable token (e.g. a URL or hash) that would push the table past the page width and the document is exported
- **THEN** the cell content wraps so the table fits within the page width rather than overflowing and being clipped

#### Scenario: Many-column table is fit to the page

- **WHEN** a table is still wider than the page content width after cell content is allowed to wrap
- **THEN** the table is scaled down to fit the page width, so all columns are visible and none are cut off

#### Scenario: Preview scroll behavior is preserved

- **WHEN** wide code or a wide table is shown in the on-screen preview
- **THEN** it remains horizontally scrollable in the preview (the fit-to-page behavior is applied only to the exported document)

#### Scenario: Fit pass does not break diagrams

- **WHEN** the document contains Mermaid diagrams and the wide-content fit pass runs on export
- **THEN** diagrams continue to be sized by the existing diagram-fitting logic and are not affected by the code/table fit pass
