import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFilters, cosmeticCSS } from './filters.mjs';
import { observeCosmetics } from './browser-observation.mjs';
import { defaultDocumentURL, studydriveURL, observationStatus, observationExitCode } from './upstream.mjs';

const report = { checkedAt: new Date().toISOString(), scope: 'CSS observations only; no extension, network rules or cookie scriptlets', results: [] };
let browser;
try {
  const rules = await readFilters();
  const selectors = rules.filter(rule => rule.type === 'cosmetic').map(({ id, selector }) => ({ id, selector }));
  const documentURL = studydriveURL(process.env.STUDYDRIVE_DOCUMENT_URL || defaultDocumentURL);
  const targets = [
    { name: 'dashboard', url: 'https://www.studydrive.net/de/dashboard', root: '[data-testid="dashboard-index-view"]' },
    { name: 'newsfeed', url: 'https://www.studydrive.net/de/newsfeed', root: '[data-testid="newsfeed-index-view"]' },
    { name: 'document', url: documentURL, root: '#document-pdf-container' },
  ];
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  report.browser = browser.version();
  report.session = process.env.STUDYDRIVE_STORAGE_STATE ? 'provided local state (authentication not assumed)' : 'guest';
  for (const width of [1280, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      storageState: process.env.STUDYDRIVE_STORAGE_STATE || undefined,
    });
    try {
      for (const target of targets) {
        const page = await context.newPage();
        const result = { page: target.name, width, status: 'inconclusive' };
        try {
          const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          result.httpStatus = response?.status();
          if (response && !response.ok()) {
            result.reason = `HTTP ${response.status()}; page not testable`;
          } else {
            const ready = await page.locator(target.root).waitFor({ state: 'visible', timeout: 12000 }).then(() => true, () => false);
            if (!ready) {
              result.reason = 'Expected view absent: login, consent, loading failure or upstream change; not a pass';
            } else {
              // Scroll only; no clicks, downloads, form submissions or consent changes.
              // A bounded sample triggers some lazy components, not an entire infinite feed.
              await page.evaluate(() => window.scrollBy(0, innerHeight));
              await page.waitForTimeout(1500);
              const observation = await page.evaluate(observeCosmetics, { selectors, css: cosmeticCSS(rules), root: target.root, pageType: target.name });
              Object.assign(result, observation, { status: observationStatus(observation) });
              if (result.status === 'inconclusive') result.reason = 'At least one expected component lacks visible, delivered content; see component coverage';
            }
          }
        } catch (error) {
          result.status = 'error';
          // Avoid persisting browser error text, which may contain account URLs.
          result.reason = `${error.name}: browser observation could not complete`;
        } finally {
          await page.close();
        }
        report.results.push(result);
        console.log(`${target.name} ${width}px: ${result.status}${result.reason ? ` — ${result.reason}` : ''}`);
      }
    } finally {
      await context.close();
    }
  }
} catch (error) {
  report.results.push({ status: 'error', reason: `${error.name}: initialization failed; check browser installation and local state path` });
} finally {
  await browser?.close();
}
const exitCode = observationExitCode(report.results);
report.status = exitCode === 0 ? 'observed' : exitCode === 2 ? 'inconclusive' : 'error-or-regression';
await mkdir('test-results', { recursive: true });
await writeFile('test-results/live.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`Live CSS result: ${report.status}. Report: test-results/live.json`);
process.exitCode = exitCode;
