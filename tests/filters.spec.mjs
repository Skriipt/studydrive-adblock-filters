import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { cosmeticCSS, readFilters } from '../scripts/filters.mjs';
import { observeCosmetics } from '../scripts/browser-observation.mjs';
import { observationStatus } from '../scripts/upstream.mjs';

const rules = await readFilters();
const cosmetics = rules.filter(rule => rule.type === 'cosmetic');
const fixture = await readFile(new URL('./fixtures/pages.html', import.meta.url), 'utf8');

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => route.abort());
  await page.setContent(fixture);
});

async function apply(page) {
  await page.addStyleTag({ content: cosmeticCSS(rules) });
}

async function checkContent(page) {
  for (const node of await page.locator('[data-expect="hidden"]').all()) await expect(node).toBeHidden();
  for (const node of await page.locator('[data-expect="visible"]').all()) await expect(node).toBeVisible();
}

test('every cosmetic rule is native CSS and has an exercised positive target', async ({ page }) => {
  for (const { id, selector } of cosmetics) {
    expect(await page.evaluate(s => CSS.supports(`selector(${s})`), selector), id).toBe(true);
    expect(await page.locator(selector).count(), id).toBeGreaterThan(0);
    // Each rule is tested independently so another rule cannot mask a bad match.
    const style = await page.addStyleTag({ content: `${selector} { display: none !important; }` });
    for (const node of await page.locator(selector).all()) await expect(node, id).toBeHidden();
    for (const node of await page.locator('[data-expect="visible"]').all()) await expect(node, id).toBeVisible();
    await style.evaluate(node => node.remove());
  }
});

test('hides intended components and spacing while preserving content and controls', async ({ page }) => {
  await apply(page);
  await checkContent(page);
  await page.locator('#navigation a').click();
  await expect(page).toHaveURL(/#document-pdf-container$/);
  await page.locator('#download').click();
  expect(await page.locator('#ad-wrapper').evaluate(el => el.getBoundingClientRect().height)).toBe(0);
});

test('spacing classes, outer wrappers and translated copy can change', async ({ page }) => {
  await page.evaluate(() => {
    document.querySelectorAll('.mx-auto').forEach(el => { el.className = 'spacing-v2'; });
    for (const id of ['ad-wrapper', 'premium-wrapper', 'marketing-wrapper']) {
      const el = document.getElementById(id);
      const wrapper = document.createElement('section');
      el.replaceWith(wrapper);
      wrapper.append(el);
    }
    document.querySelector('#premium-card p').textContent = 'Dokumente mit Premium herunterladen.';
    document.querySelector('#premium-card button').textContent = 'Mehr erfahren';
  });
  await apply(page);
  await checkContent(page);
});

for (const marker of ['class', 'data-testid']) {
  test(`Premium banner survives loss of its logo ${marker}`, async ({ page }) => {
    await page.locator('#premium-card [data-testid]').evaluate((node, attr) => node.removeAttribute(attr), marker);
    await apply(page);
    await checkContent(page);
  });
}

test('late insertions and attribute changes are filtered without reloading', async ({ page }) => {
  const ad = await page.locator('#ad-wrapper').evaluate(el => { const html = el.outerHTML; el.remove(); return html; });
  await apply(page);
  await page.locator('#dashboard-widgets').evaluate((el, html) => el.insertAdjacentHTML('beforeend', html), ad);
  await checkContent(page);
  await page.locator('#empty-widget').evaluate(el => { el.id = 'gam-slot-sd_mew_newsfeed_pc-4'; el.textContent = 'Late ad'; });
  await expect(page.locator('#gam-slot-sd_mew_newsfeed_pc-4')).toBeHidden();
});

test('independent fallbacks hide ad contents after the root class is renamed', async ({ page }) => {
  await page.locator('#dashboard-ad').evaluate(el => { el.className = 'placement-v2'; });
  await apply(page);
  await expect(page.locator('#gam-slot-sd_desk_dashboard_pa-12')).toBeHidden();
  // Conservative degradation: do not guess which unknown ancestor is disposable.
  await expect(page.locator('#dashboard-widgets')).toBeVisible();
  await expect(page.locator('#mixed-article')).toBeVisible();
  await page.locator('#replacement-banner img').evaluate(el => {
    el.src = 'https://www.studydrive.net/images/premium_spotlights/en/wide_spotlight_premium.svg?v=2';
  });
  await expect(page.locator('#replacement-banner')).toBeHidden();
  await expect(page.locator('#renamed-ad-shell')).not.toHaveCSS('display', 'none');
});

test('shared Premium and marketing wrappers keep neighbouring useful content', async ({ page }) => {
  await page.evaluate(() => {
    for (const id of ['premium-wrapper', 'marketing-wrapper']) {
      const wrapper = document.getElementById(id);
      wrapper.dataset.expect = 'visible';
      const article = document.createElement('article');
      article.dataset.expect = 'visible';
      article.textContent = 'Useful sibling';
      wrapper.append(article);
    }
  });
  await apply(page);
  await checkContent(page);
});

test('live observer distinguishes effective CSS, ineffective CSS and hidden useful content, then restores the page', async ({ page }) => {
  const input = { selectors: cosmetics, css: cosmeticCSS(rules), root: '#dashboard', pageType: 'dashboard' };
  expect(observationStatus(await page.evaluate(observeCosmetics, input))).toBe('observed');
  await expect(page.locator('#premium-card')).toBeVisible();
  expect(observationStatus(await page.evaluate(observeCosmetics, { ...input, css: '' }))).toBe('regression');
  expect(observationStatus(await page.evaluate(observeCosmetics, {
    ...input, css: `${input.css}\n#navigation { display: none !important; }`,
  }))).toBe('regression');
  await expect(page.locator('#navigation')).toBeVisible();
});

test('live observer cannot report success for an empty/ad-free page or missing view', async ({ page }) => {
  const input = { selectors: cosmetics, css: cosmeticCSS(rules), root: '#dashboard', pageType: 'dashboard' };
  // Pre-hidden slots are not proof of this observer's filtering effect.
  await apply(page);
  expect(observationStatus(await page.evaluate(observeCosmetics, input))).toBe('inconclusive');
  await page.setContent('<main id="dashboard"><h1>Normal content</h1></main>');
  expect(observationStatus(await page.evaluate(observeCosmetics, input))).toBe('inconclusive');
  expect(observationStatus(await page.evaluate(observeCosmetics, { ...input, root: '#absent' }))).toBe('inconclusive');
  await expect(page.locator('h1')).toBeVisible();
});

test('a new inner logo wrapper does not break the Premium filter', async ({ page }) => {
  await page.locator('#premium-card [data-testid]').evaluate(logo => {
    const wrapper = document.createElement('div');
    logo.replaceWith(wrapper);
    wrapper.append(logo);
  });
  await apply(page);
  await checkContent(page);
});

for (const location of ['card', 'text-column']) {
  test(`useful content added inside the Premium ${location} is preserved`, async ({ page }) => {
    await page.evaluate(location => {
      const card = document.getElementById('premium-card');
      card.dataset.expect = 'visible';
      document.getElementById('premium-wrapper').dataset.expect = 'visible';
      const article = document.createElement('article');
      article.dataset.expect = 'visible';
      article.textContent = 'Useful course recommendation';
      (location === 'card' ? card : card.firstElementChild).append(article);
    }, location);
    await apply(page);
    await checkContent(page);
  });
}

test('a successful inline filter cannot mask an unhidden or absent Premium component', async ({ page }) => {
  const input = { selectors: cosmetics, css: cosmeticCSS(rules), root: '#dashboard', pageType: 'dashboard' };
  await page.locator('#premium-card p').evaluate(p => {
    const wrapper = document.createElement('div');
    p.replaceWith(wrapper);
    wrapper.append(p);
  });
  const observation = await page.evaluate(observeCosmetics, input);
  expect(observation.components.find(c => c.id === 'inline').status).toBe('observed');
  expect(observation.components.find(c => c.id === 'premium').status).toBe('regression');
  expect(observationStatus(observation)).toBe('regression');
  await page.locator('#premium-wrapper').evaluate(el => el.remove());
  expect(observationStatus(await page.evaluate(observeCosmetics, input))).toBe('inconclusive');
});

test('empty, loading, and uninspectable inline slots are inconclusive despite CSS matches', async ({ page }) => {
  const input = { selectors: cosmetics, css: cosmeticCSS(rules), root: '#newsfeed', pageType: 'newsfeed' };
  for (const content of ['', '<span>Loading…</span>', '<iframe src="https://advertiser.example"></iframe>']) {
    await page.setContent(`<main id="newsfeed"><article>Normal post</article><div class="feed-placement" style="height:100px"><div id="gam-slot-sd_desk_newsfeed_pa-1">${content}</div></div></main>`);
    const observation = await page.evaluate(observeCosmetics, input);
    expect(observation.matches).toBeGreaterThan(0);
    expect(observation.components[0].contentBefore).toBe(0);
    expect(observationStatus(observation)).toBe('inconclusive');
    await expect(page.locator('article')).toBeVisible();
  }
});
