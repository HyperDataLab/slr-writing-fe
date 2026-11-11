# SLR AI Writing UI decisions

## Product

SLR AI Writing is a research workspace for organizing systematic literature review evidence and drafting traceable manuscripts. The interface prioritizes reviewable source links, clear human approval states, and a desktop-first workspace that remains usable on narrow screens.

## Visual system

- Preserve the existing SLR brand: Manrope, blue primary `#0071bc`, light neutral canvas, and shared React components.
- Keep decorative borders transparent, text inputs lightly bordered, and keyboard focus clearly visible.
- Use compact, readable cards and reserve stronger color for selected, ready, warning, and approval states.

## Outline Builder · option A

- Use a structure-first layout: manuscript sections in the main column, research-question coverage and OWNER H1 review in the side rail.
- Give the desktop outline a wide canvas so the section list and review rail match the proportions of the approved wireframe.
- Show the RQ IDs and the actual subsection titles returned by the outline data. Do not infer full RQ text when the API does not provide it.
- Keep sections in one compact structure card; show subsection titles and RQ IDs inline, and place editing controls in a per-section disclosure.
- Keep mapping edits and validation details available in disclosures so the review view stays compact without removing editing or blocker information.
- Keep the generic profile's unverified notice available from a compact badge disclosure, rather than a full-width warning strip.
- After OWNER approval, show the recorded decision metadata and provenance-event status.
