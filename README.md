# Studydrive adblock filters

Filter lists that remove ads and "please disable your adblocker" banners on Studydrive (`studydrive.net`). Written for uBlock Origin syntax.

This is a standalone project. It is not affiliated with, endorsed by, or connected to Studydrive.

## Files

- `studydrive-ublock.txt` is the main list. It blocks Google Ad Manager requests on Studydrive, hides the dashboard ad slot and its adblock fallback banner, hides the large "Download documents with Premium" banner (the sidebar Premium link stays), and stops the full-screen ad on document pages by setting two cookies on page load.
- `studydrive-ublock-optional.txt` is optional. It only hides the Braze marketing banner on the dashboard.

## List URLs

Main list (use this one):

```
https://raw.githubusercontent.com/Skriipt/studydrive-adblock-filters/main/studydrive-ublock.txt
```

Optional list:

```
https://raw.githubusercontent.com/Skriipt/studydrive-adblock-filters/main/studydrive-ublock-optional.txt
```

Subscribing by URL is the simplest option, because the list can update itself. Only add lists from sources you trust.

## uBlock Origin (full version)

This is the intended target. See the [uBO Filter lists](https://github.com/gorhill/uBlock/wiki/Dashboard:-Filter-lists) and [My filters](https://github.com/gorhill/uBlock/wiki/Dashboard:-My-filters) docs.

**Method 1: subscribe by URL (recommended)**

1. Open the uBlock Origin dashboard (click its icon, then the cogwheel).
2. Go to **Filter lists** and scroll to **Custom**.
3. Tick **Import…**, paste the main list URL, and click **Apply changes**.
4. Reload Studydrive completely (Ctrl+Shift+R, or Cmd+Shift+R on Mac).

**Method 2: paste the rules**

1. Open `studydrive-ublock.txt` and copy its content.
2. In the dashboard, open **My filters** and make sure **Enable my custom filters** is ticked there.
3. Paste the rules, click **Apply changes**, then reload Studydrive completely.

## uBlock Origin Lite

Current Chromium versions: setup is available, but this list has not been tested in uBOL. See the [uBOL permissions notes](https://github.com/uBlockOrigin/uBOL-home/wiki/Justification-for-the-declared-permissions#userscripts).

1. Open the uBO Lite dashboard and go to **Filter lists**.
2. In the **Add filter list…** field, paste the main list URL and click **Add**. It appears under **Imported lists**.
3. The cosmetic and cookie rules need extra permission. To enforce them, open your browser's extensions page (`chrome://extensions`), open the uBO Lite details, and turn on **Allow user scripts**.
4. Reload Studydrive completely.

Use the list URL here. The manual **Custom filters > Import / Export** box only imports cosmetic filters, so pasting the whole file there will not load all rules. If you do not see the fields above, update uBO Lite or use full uBlock Origin.

## AdGuard Browser Extension

Installation is documented by AdGuard; this list has not been tested in AdGuard. See [AdGuard custom filters](https://kb.adguard.com/kb/adguard-browser-extension/features/filters/) and the [scriptlet compatibility table](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/compatibility-table.md), which lists `set-cookie` as compatible with uBO.

1. Open **Settings > Filters > Custom** and click **Add custom filter**.
2. Paste the main list URL, click **Next**, then confirm and enable the filter.
3. In the MV3 version, Settings > Filters > Custom may warn you to enable **Allow User Scripts** in the browser's extension settings. Do that, return to AdGuard, then add the filter. See the [release notes](https://adguard.com/en/versions/browser-extension/release.html).
4. Reload Studydrive completely.

As a manual alternative, use **Settings > User rules**, import or paste the rules, and save.

## Adblock Plus and AdBlock

Full support is not expected, because the cookie rules use uBlock Origin's `+js(...)` scriptlet syntax. These blockers may take some rules (such as the network and hiding rules) but the full-screen ad fix cannot be assumed. This was not tested. Prefer one of the blockers above.

## Limits

- The filters hide ads and warnings. They do not change your account, Premium status, or download rights.
- The main list was only briefly smoke-tested by a user. The Premium-banner rule was added afterward and checked only with local selector tests. It is not end-to-end tested with a logged-in account.
- The document counter is set to a finite number (32767) on every full page load. Navigating inside the site without a full reload still lowers it.
- Studydrive can change its page markup at any time, which can break individual rules.

## Troubleshooting

1. Click **Apply changes** (or save), then do a full reload of the page.
2. Check that the list shows a non-zero count in your blocker's list settings.
3. Make sure cosmetic filtering is not turned off for Studydrive.
4. If an ad comes back, the site markup has probably changed. Please open an issue.

## Uninstall

1. Remove the list in your blocker's filter list settings (or delete the pasted rules), and apply.
2. Optional: delete only the cookies `sd_fp_docs_left` and `sd_fp_until` for `studydrive.net` in your browser's cookie viewer.

Do not clear all site data. That also logs you out.
