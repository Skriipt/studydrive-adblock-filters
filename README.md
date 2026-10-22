<div align="center">

# Studydrive Adblock Filters

A small filter list that removes ads, Premium prompts and anti-adblock banners from Studydrive.

[Filter list URL](#filter-list-url) · [uBO Lite](#ublock-origin-lite) · [uBlock Origin](#ublock-origin) · [AdGuard](#adguard-browser-extension)

</div>

## What it does

- Blocks Google ad delivery on `studydrive.net`
- Hides dashboard and newsfeed ad slots, including their "please disable your adblocker" fallback graphics
- Hides the large "Download documents with Premium" banner and a separate dashboard marketing banner
- Stops the full-screen ad on document pages before it opens and locks scrolling

The list only changes what you see. It does not affect your account, Premium status or download rights, and the sidebar Premium link stays in place.

Not affiliated with or endorsed by Studydrive.

## Filter list URL

```
https://raw.githubusercontent.com/Skriipt/studydrive-adblock-filters/main/studydrive-ublock.txt
```

Subscribe by URL so your blocker picks up updates automatically.

| Blocker | Status |
| --- | --- |
| [uBlock Origin Lite](#ublock-origin-lite) (Chrome, Edge and other Chromium browsers) | Working in maintainer testing with the setup below |
| [uBlock Origin](#ublock-origin) | Core rules briefly tested |
| [AdGuard Browser Extension](#adguard-browser-extension) | Setup per AdGuard's documentation; not tested with this list |

## uBlock Origin Lite

**Order matters: allow user scripts first, then add the list.**

1. Open `chrome://extensions` (Edge: `edge://extensions`), find **uBlock Origin Lite**, click **Details** and turn on **Allow user scripts**.
2. Open the uBO Lite dashboard and go to **Filter lists**.
3. Expand **Add filter list…**, paste the URL above and click **Add**. The list appears under **Imported lists**.
4. Fully reload Studydrive (Ctrl+Shift+R, or Cmd+Shift+R on macOS).

uBO Lite needs this permission to apply the hiding and cookie rules from imported lists ([why](https://github.com/uBlockOrigin/uBOL-home/wiki/Justification-for-the-declared-permissions#userscripts)).

**Added the list before granting the permission?** If banners still appear, remove the list from **Imported lists**, make sure **Allow user scripts** is on, add the same URL again and fully reload. In testing, enabling the permission afterwards was not enough; re-adding the list fixed it.

Use the **Add filter list…** field rather than **Custom filters > Import / Export**, which only accepts cosmetic filters. If the field is missing, update uBO Lite.

## uBlock Origin

1. Open the dashboard (gear icon in the popup) and go to **Filter lists**.
2. Under **Custom**, tick **Import…**, paste the URL and click **Apply changes**.
3. Fully reload Studydrive.

Alternatively, open **My filters**, tick **Enable my custom filters** on that tab, paste the contents of [`studydrive-ublock.txt`](studydrive-ublock.txt) and click **Apply changes**. Pasted rules do not update automatically.

Docs: [Filter lists](https://github.com/gorhill/uBlock/wiki/Dashboard:-Filter-lists) · [My filters](https://github.com/gorhill/uBlock/wiki/Dashboard:-My-filters)

## AdGuard Browser Extension

> Not tested with this list. The steps follow AdGuard's documentation.

1. If AdGuard asks you to enable **Allow User Scripts** (MV3 version), do that first.
2. Go to **Settings > Filters > Custom**, enable the group if needed and click **Add custom filter**.
3. Paste the URL, click **Next** and confirm the filter is enabled.
4. Fully reload Studydrive.

Docs: [Custom filters](https://kb.adguard.com/kb/adguard-browser-extension/features/filters/) · [Release notes](https://adguard.com/en/versions/browser-extension/release.html) · [Scriptlet compatibility](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/compatibility-table.md)

## Limits

- Studydrive can change its pages at any time, which may break individual rules. If something reappears, please [open an issue](https://github.com/Skriipt/studydrive-adblock-filters/issues).
- The full-screen ad fix resets on every full page load. Navigating within the site without reloading counts down a large but finite counter.
- Testing so far covers the setups listed above, not every browser or account type.

## Removal

Remove the list from your blocker and reload Studydrive. To also reset the full-screen ad state, delete only the `sd_fp_docs_left` and `sd_fp_until` cookies for `studydrive.net`. Clearing all site data also signs you out.

## Related project

[Studydrive PDF Downloader](https://github.com/Skriipt/studydrive-pdfdownloader) is a Chromium extension that adds a **Download PDF** button for saving the document preview already loaded in your browser, which may have fewer pages than the original. It is a separate project; neither requires the other.

## License

[MIT](LICENSE)
