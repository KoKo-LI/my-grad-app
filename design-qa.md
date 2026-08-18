# Design QA — My Grad Path Dashboard

## Comparison target

- Source visual truth: `/Users/edward/.codex/generated_images/019ff714-8b5e-7940-ae04-4e3c369b5541/exec-eec5b359-be0b-481d-a8d1-b4d8d042507d.png`
- Implementation screenshot: `/private/tmp/my-grad-implementation-dark-final.png`
- Full-view comparison: `/private/tmp/my-grad-design-comparison-final.png`
- Focused tier-board comparison: `/private/tmp/my-grad-design-comparison-focus.png`
- State: uninitialized Dashboard, dark theme, desktop sidebar expanded.
- Source raster: 1487 × 1058 px. Implementation CSS viewport: 1440 × 1024 px; browser capture: 1440 × 1005 px at device scale factor 1.
- Normalization: the full-view panels were aligned to 720 × 512 px; the selected core region was aligned to 720 × 400 px. The source and implementation aspect ratios differ by less than 0.1%.

## Comparison history

### Pass 1 — blocked

- [P1] The uninitialized guidance banner shifted the title and three selection tiers below the source’s opening rhythm.
  - Evidence: the first comparison showed a full-width banner above `APPLICATION INTELLIGENCE`, whereas the selected visual begins directly with the title and selection workspace.
  - Fix: removed the redundant banner. The unlock cards retain both profile-entry and default-preset paths, so direct-Dashboard guidance remains intact.

### Pass 2 — passed

- The revised full-view and focused tier-board comparisons show the same dark workspace hierarchy: fixed rail, compact command header, title/action area, three equal selection tiers, dotted unlock cards, and a supporting recommendation surface.
- The intentional product differences are limited to the three original navigation destinations and the existing deadline/checklist areas, which preserve requested functionality rather than adding unsupported mock sections.

## Required fidelity surfaces

### Fonts and typography

- Uses a system-first Apple-style sans stack with compact command-bar text, an optically heavier Dashboard heading, and modest uppercase tracking for metadata labels.
- Heading, tier title, body copy, and action labels remain legible at desktop and narrow mobile widths; no truncation affects core actions.

### Spacing and layout rhythm

- Desktop keeps a 264 px navigation rail, restrained header height, generous content gutter, equal-width three-tier grid, 20–24 px internal card spacing, and rounded surfaces close to the selected source.
- The focused comparison confirms aligned unlock-card hierarchy, action placement, count badge position, and supporting content immediately below the tiers.

### Colors and visual tokens

- Dark mode uses `zinc-950` base with `zinc-900/50` glass surfaces, white/10 dividers, restrained blue primary actions, and violet/cool semantic edge accents.
- Light mode uses `zinc-50`, translucent white panels, subtle borders, and measured elevation. The header control persists either mode and announces the change with a Toast.

### Image and icon fidelity

- The selected visual contains no required raster imagery. All interactive interface icons now use the Phosphor icon family, maintaining consistent stroke and optical weight without custom SVG or emoji stand-ins.
- Initials-only avatar remains a deliberate account marker and does not substitute for a missing image asset.

### Copy and content

- Existing Chinese admissions copy, matching tiers, persistence guidance, and academic-background terminology were preserved. Empty-state messaging leads to either manual entry or the existing default academic preset.

### Interactions, states, and accessibility

- Verified: dark/light toggle and success Toast; full-screen profile open/close transition; mobile sidebar open/close; disabled/loading recommendation action; empty/uninitialized unlock controls.
- The profile view uses a semantic dialog with a named return control. Search and controls have accessible labels, visible focus rings, practical button sizing, and reduced-motion overrides.
- Browser console: no new errors after the final reload. The session retained one stale development-time module-resolution error from the moment the component file was being replaced; it did not recur after the final page loaded.

### Responsive check

- Mobile evidence: `/private/tmp/my-grad-implementation-mobile-dark.png` captured at 390 × 844 px. Header controls remain reachable, search contracts without overlap, and tier cards stack into a readable single column.

## Follow-up polish

- [P3] The selected concept contains a denser navigation inventory than the current product’s three requested routes. Add future routes only when their underlying workflows are introduced.

## Implementation checklist

- [x] Apply dark/light token system and persisted theme controls.
- [x] Add full-screen Framer Motion profile transition.
- [x] Add hover, press, focus, loading, and Toast feedback.
- [x] Verify desktop, mobile, and primary interactions.

## Incremental pass — Deadline & timeline

- Implementation evidence, dark: `/private/tmp/my-grad-incremental-dark.png` at 1440 × 1005 px, rendered from a 1440 × 1024 CSS viewport.
- Implementation evidence, light: `/private/tmp/my-grad-incremental-light.png` at 1440 × 1005 px, rendered from the same viewport and interaction state.
- Scope truth: this incremental pass has no new mock image; it verifies the user-specified horizontal Deadline banner, the directly following application timeline, and the requested glass/ambient treatment against the established visual system.

### Findings

- No actionable P0/P1/P2 findings.
- The Deadline module now spans the complete content rail, giving the nearest deadline a dedicated title, program, date, and countdown hierarchy.
- The application overview appears immediately below it. It shows an explicit empty state until an applicant uses the existing `加入选校` control; once populated, each selected school receives four dynamic dates calculated from its own deadline. Hover and keyboard focus reveal the complete milestone preview.
- Header, recommendation, Deadline, timeline, and checklist surfaces use the same translucent light and dark card tokens. Fixed low-contrast ambient glows are visible without reducing text contrast.
- Dark/light toggle was exercised in-browser and restored to the prior dark setting. Browser console reported no warnings or errors after the final reload.

### Final checks

- [x] Timeline types live in `src/types/index.ts`; milestone data is derived, not hard-coded per school.
- [x] Existing Framer Motion profile transition is retained; timeline nodes add isolated hover/tap motion.
- [x] Global active press feedback and card hover elevation remain intact.
- [x] ESLint, TypeScript, diff whitespace check, and final Webpack production build pass.

final result: passed

## Incremental pass — Saved target-school tier route

### Comparison target

- Source visual truth: `/Users/edward/.codex/generated_images/019ff714-8b5e-7940-ae04-4e3c369b5541/exec-eec5b359-be0b-481d-a8d1-b4d8d042507d.png` (the established Dashboard visual system).
- Implementation screenshot: `/private/tmp/my-grad-saved-target-schools-reach-final.png`.
- Full-view comparison: `/private/tmp/my-grad-saved-target-schools-comparison.png`.
- State: dark theme, Reach collection route, one locally saved school. The source is the established Dashboard rather than a one-to-one mock for this new route, so this review validates the inherited visual system rather than matching page composition.
- Source raster: 1487 × 1058 px. Implementation screenshot: 462 × 674 px at the in-app browser’s active CSS viewport and device scale factor 1. The comparison image normalizes both captures to 900 px content height and labels their distinct states.

### Findings

- No actionable P0/P1/P2 findings.
- The fixed-height tier panels retain a stable 420 px frame and render only two saved-school previews. Above that limit, their primary footer action becomes `浏览更多已添加 · N 所` and routes to the matching Reach, Target, or Safety collection.
- The collection route preserves the dark glass surfaces, violet accent hierarchy, rounded control geometry, restrained shadows, and compact high-contrast typography of the established Dashboard.
- The direct route, return-to-Dashboard link, school-detail overlay, visible group selector, and remove control were exercised in-browser. School detail loaded verified public data and rankings without console warnings or errors.
- The current browser profile held only one Reach school, so the overflow CTA was not clicked against user data merely to fabricate a test state. Its conditional route and all three statically generated destinations pass TypeScript, ESLint, and production Webpack build validation.

### Required fidelity surfaces

- **Fonts and typography:** The collection title uses the same bold, near-black gradient hierarchy; school names, metadata, and compact controls remain readable without clipping at the active narrow viewport.
- **Spacing and layout rhythm:** The new route uses the existing 24–32 px glass-card rhythm, consistent radii, and a three-column desktop / two-column tablet / single-column mobile content grid.
- **Colors and visual tokens:** The pale violet collection surface, translucent white cards, dark `zinc` glass treatment, subtle borders, and violet interaction affordances match the established theme system.
- **Image and icon fidelity:** No new non-standard imagery is required. The existing Phosphor icon family remains consistent across navigation, school actions, and metadata.
- **Copy and content:** The route uses the user’s saved school names, regions, programs, assigned tier, and addition date; it does not fabricate admission data.

### Implementation checklist

- [x] Stabilize the three Dashboard tier-panel heights as saved-school counts grow.
- [x] Limit each panel preview to two saved schools.
- [x] Add tier-specific, statically generated routes for the complete saved-school collection.
- [x] Preserve school detail, grouping, and removal workflows within the new route.
- [x] Verify the new route and school-detail interaction in the browser; check browser console, TypeScript, ESLint, and production build.

final result: passed
