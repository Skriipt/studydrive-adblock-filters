# Maintaining the list

The distributed product remains one text file. Node, Playwright and GitHub Actions are maintainer tools, not requirements for subscribers. Every active rule has a stable `! Rule:` identifier used by test and observation reports.

## Boundaries

- Match dedicated ad components and their verified identifiers. Do not hide generic `Premium` text, all dialogs, generic images or entire feed groups.
- Prefer native CSS. Never nest `:has()` inside `:has()`; use separate conditions with explicit descendant paths instead. Test `CSS.supports()` for every rule.
- Collapse a dashboard wrapper only when the known ad/card is its sole element child. Text-only siblings are not detectable by `:only-child`; this assumes the source-derived widget wrapper remains a dedicated container.
- Inline fallback rules may hide only ad contents after a component rename. Retaining an unknown empty shell is safer than climbing arbitrary ancestors and losing posts.
- Keep the fullscreen fix separate. Hiding its dialog or slot can leave body scrolling locked. Do not globally force scrolling on: legitimate account dialogs also need scroll locks.
- Keep network rules scoped to `studydrive.net`. Do not block whole site bundles, shared APIs or Braze globally; those may also provide useful widgets.

## Source evidence, checked 2026-10-23

The logged-out homepage serves a different Nuxt frontend. A public document page exposes the legacy app used by these rules. The source checker starts at a public document, finds the current `assets/main-*.js`, then resolves the current component chunks. It does not rely on the hashes below staying unchanged.

| Rule IDs | Evidence and intended boundary |
| --- | --- |
| `google-tag`, `google-delivery` | Existing site-scoped Google ad delivery rules retained. Main bundle points to Google's GPT script. No new network hosts added. |
| `feed-placement`, `dashboard-ad-wrapper` | `SpotlightFeed` root is `.feed-placement`; dashboard `LazyLoad` renders a dedicated wrapping `div`. The newsfeed group also contains posts, so no group removal. |
| `inline-slot-fallback` | Main builds `gam-slot-${placementKey}`; components generate `sd_desk`/`sd_mew` placements. Exclude both `doc_fp` prefixes, including suffixed IDs. |
| `inline-image-fallback` | Inline fallback is an anchor directly containing an image under `/images/premium_spotlights/{de,en}/wide_spotlight_premium.svg`. Fullscreen uses a different filename. |
| `dashboard-premium-card`, `dashboard-premium-wrapper` | `PremiumSpotlight` has exactly two element columns: text first and logo last. Logo has both `.logo-studydrive-premium` and `data-testid="sidebar-logo-studydrive"`. Extra logo wrappers are tolerated; an extra column or nested article/section/navigation/form prevents hiding the container. |
| `dashboard-marketing`, `dashboard-marketing-wrapper` | `DashboardWidgetBrazeBanner` renders `#dashboard-braze-banner-container` inside the dashboard's lazy wrapper. |
| `fullscreen-counter`, `fullscreen-countdown` | Main declares the two cookie names. The `linkify` chunk contains the actual counter logic: decrement documents remaining; open at zero or an active close countdown. Keep `32767` and `0`; no account or subscription state changes. |

Source files inspected:

- [Main app](https://www.studydrive.net/assets/main-DcywHFAI.js)
- [Dashboard](https://www.studydrive.net/assets/views/Dashboard-Cr3HZEIV.js)
- [Inline placements](https://www.studydrive.net/assets/views/DashboardWidgetBannerSpotlight-sUcytlo4.js)
- [Premium card](https://www.studydrive.net/assets/views/DashboardWidgetPremium-DYULCMY7.js)
- [Marketing banner](https://www.studydrive.net/assets/views/DashboardWidgetBrazeBanner-AhfOYqIL.js)
- [Newsfeed groups](https://www.studydrive.net/assets/views/NewsfeedIndex-BIBwgknR.js)
- [Document view](https://www.studydrive.net/assets/views/DocumentShow-CczbkBAp.js)
- [Cookie counter logic](https://www.studydrive.net/assets/misc/linkify-Cy6-DMkW.js)

Bundles and raw captures stay in ignored `evidence/`; fixtures contain only a minimal structural reconstruction with invented content. Marker presence is an early warning mechanism, not a semantic proof of unchanged behavior. A minifier change can trigger a false alarm; unchanged markers can coexist with changed behavior.

## Automated checks

Run `npm ci --ignore-scripts`, `npx playwright install chromium`, then `npm test`. On Linux CI use `npx playwright install --with-deps chromium`.

To use an existing browser instead of downloading one:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/snap/bin/chromium npm test
```

The offline suite tests the actual selectors both independently and together. It exercises 1280px and 390px layouts, late insertion, attribute changes, translated copy, renamed spacing classes, outer/inner wrappers and each missing Premium logo marker. It checks that content, document preview, navigation, download button, sidebar Premium access and legitimate dialogs remain visible, including useful content added inside a former Premium card. Synthetic clicks verify fixture controls only, not real downloads or live site behavior.

The small parser accepts only this project's domain-scoped network rules, native CSS and two `set-cookie` scriptlets. Unknown syntax fails. It is not a full uBO/AdGuard parser. Browser tests validate CSS; cookie tests protect the allowed names/values, not extension execution or timing.

`npm run check:upstream` fetches the public document and eight current JS files, sequentially with request timeouts. The NewsfeedIndex integration is checked separately from the reusable ad component. Missing markers or an unavailable page fail the command. Reports include public asset URLs, SHA-256 values and missing markers, not source contents or the supplied document path. Request/response errors are sanitized before reporting.

`npm run check:live` visits dashboard, newsfeed and a public document at both viewport sizes in disposable browser contexts. It samples lazy content with one scroll, records selector matches, temporarily applies the cosmetic rules, and checks that previously visible content landmarks remain visible. It removes its CSS afterwards. It does not click consent buttons, write ad cookies, submit forms or install an extension; the site itself may perform its usual visit tracking.

Independent component sentinels report **inline ads, Premium and marketing** separately on the dashboard, and **inline ads** on newsfeed/document views. A working ad rule cannot override a visible Premium candidate or an unobserved component. Each expected component must have visible content before filtering and be hidden afterwards for the visit to be `observed`. An optional banner that was not served makes coverage incomplete, even when other components were successfully observed.

For inline ads, mere slot dimensions or loading text are insufficient: the observer requires a loaded image/video, a visible HTTP(S) creative link inside the slot, or inspectable loaded frame content. Loaded replacement images also qualify. Empty slots, already hidden elements and uninspectable cross-origin creatives remain `inconclusive`. These are conservative delivery hints, not proof of every possible creative format. Sentinel recognition can itself drift; combine observations with source checks and manual inspection.

Live command exit codes:

- `0`: matching targets observed and the sampled CSS checks passed on every configured visit.
- `1`: browser/tool error or a possible hiding regression; inspect the report.
- `2`: incomplete evidence, such as no ads, guest redirects, missing views or HTTP errors. This is not a blocking pass.

Both commands write aggregate JSON to ignored `test-results/`. Do not run them concurrently with `npm test`, which clears Playwright's output directory. Browser reports exclude page text, screenshots, cookies and actual visited account URLs. Neither command proves all functionality or browser-extension compatibility.

Optional local session and document configuration:

```sh
STUDYDRIVE_STORAGE_STATE=.auth/studydrive.json npm run check:live
STUDYDRIVE_DOCUMENT_URL=https://www.studydrive.net/de/doc/example/123 npm run check:upstream
```

The document URL must be a real public document URL without a query or fragment; the example above is a placeholder. Both commands accept `STUDYDRIVE_DOCUMENT_URL`. Session state must already exist as a Playwright storage-state file, and can contain login credentials. Keep it under ignored `.auth/`, never include it in reports or commit it. No session is exported or persisted by these checks. A supplied state file is not assumed to mean authentication succeeded.

## Prepared GitHub workflows

- `verify.yml`: offline regression tests on pushes, pull requests and manual dispatch.
- `upstream.yml`: public source checks and guest browser observations on Mondays at **06:23 UTC**, or manual dispatch. Jobs have read-only repository permissions; nothing publishes rules or opens issues.

Schedules become active only after the workflow is published to the default branch and Actions is enabled. Until then these are local definitions, with no active recurring task. Source drift fails its job. Browser regressions/errors fail collection; an inconclusive guest run creates an explicit warning and **inconclusive** job summary while allowing the collection job to finish. A green collection job means the observation ran, not that blocking was validated. No success badge is used for live coverage. Only the two aggregate JSON reports are uploaded, retained for 14 days.

## Compatibility evidence

| Date / version | Evidence | Limit |
| --- | --- | --- |
| Through 2026.10.23.2 | README records user smoke tests in uBO and uBO Lite | Exact browser, extension versions and full scenario coverage were not recorded |
| 2026-10-23 / 2026.10.23.3, PR candidate | 30 browser checks and six contract checks passed; Chromium 155.0.8059.79 on Linux ARM64, Playwright 1.64.1; 1280px and 390px | Not an installed-extension or authenticated live verification |
| 2026-10-23 / live CSS observations | Guest runs at both widths returned `inconclusive` for dashboard, newsfeed and document | Expected views unavailable; the collaborative browser also reported HTTP 429 resource errors. No live blocking pass claimed |
| AdGuard | Setup follows official documentation | No list-specific extension verification yet |

For each future manual verification record date, list version, browser/version, blocker/version, filtering mode/permissions, language, viewport and guest/free/Premium account state. Do not replace missing evidence with a generic “tested” label.

## Before releasing a filter change

1. Inspect current DOM or shipped component code; add only verified identifiers. Add a positive fixture and a nearby normal-content counterexample for each new target.
2. Run the offline suite and source check. Investigate drift rather than silently replacing expected markers. Review live observations separately; absent ads cannot validate blocking.
3. With the actual blocker and a signed-in free account, check dashboard, newsfeed and multiple document pages. Verify full reload and in-site navigation, scrolling, document preview, normal links/controls and retained sidebar Premium access. Check mobile and desktop, and compare with this list disabled. Do not perform paid/account-changing actions just to test a rule.
4. Check uBO and uBO Lite separately. Lite requires imported-list user-script permission. Keep AdGuard unverified until tested there. Record precise versions and outcomes in the evidence table.
5. Update the list version and changelog only for intended changes; publish only when authorized. Subscribed lists can update automatically according to blocker settings; pasted rules cannot. `Expires: 1 day` is an update hint, not a guaranteed delivery deadline.
6. If useful content disappears, remove/disable this list and reload, then report the page type, versions and reproduction through the issue form. To undo the fullscreen state as well, delete only `sd_fp_docs_left` and `sd_fp_until`.

References: [uBO procedural/native cosmetic filtering](https://github.com/gorhill/uBlock/wiki/Procedural-cosmetic-filters), [scriptlet resources](https://github.com/gorhill/uBlock/wiki/Resources-Library#set-cookie), [list updates](https://github.com/gorhill/uBlock/wiki/Dashboard:-Filter-lists), [uBO Lite user-script permissions](https://github.com/uBlockOrigin/uBOL-home/wiki/Justification-for-the-declared-permissions#userscripts).
