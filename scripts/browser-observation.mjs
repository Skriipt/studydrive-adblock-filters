// Self-contained function passed to page.evaluate; never returns page text or URLs.
export function observeCosmetics({ selectors, css, root, pageType }) {
  const visible = el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getClientRects().length > 0;
  const view = document.querySelector(root);
  if (!view || !visible(view)) return { routeReady: false, protectedCount: 0, matches: 0 };
  const candidates = [...new Set([
    view, ...document.querySelectorAll('h1, nav, aside'),
    ...view.querySelectorAll('article, input, a[href*="/doc/"], a[href*="/course/"], [data-testid="document-tab"]'),
    ...document.querySelectorAll('aside a, nav a'),
  ])].filter(visible);
  const counts = selectors.map(({ id, selector }) => {
    const nodes = [...document.querySelectorAll(selector)];
    return { id, count: nodes.length, visibleBefore: nodes.filter(visible).length };
  });
  // Independent sentinels, not the hiding selectors: a missed component must
  // remain detectable when its exact DOM shape no longer matches a filter.
  const logo = '.logo-studydrive-premium,[data-testid="sidebar-logo-studydrive"]';
  const inline = '.feed-placement, [id^="gam-slot-sd_desk_"], [id^="gam-slot-sd_mew_"], a:has(img[src*="/images/premium_spotlights/"][src*="/wide_spotlight_premium.svg"])';
  const inlineNodes = [...view.querySelectorAll(inline)].filter(el =>
    !el.closest('.doc-fullscreen-spotlight') && !/^gam-slot-sd_(desk|mew)_doc_fp/.test(el.id));
  const nodesByComponent = {
    inline: inlineNodes.filter(el => !inlineNodes.some(parent => parent !== el && parent.contains(el))),
    premium: [...new Set([...view.querySelectorAll(logo)].flatMap(mark => {
      if (mark.closest('aside,nav,article')) return [];
      for (let el = mark.parentElement; el && el !== view; el = el.parentElement) {
        if (el.querySelector('p')) return [el];
      }
      return [];
    }))],
    marketing: [...view.querySelectorAll('#dashboard-braze-banner-container')],
  };
  // Empty/loading slots and inaccessible cross-origin creatives are not proof
  // of delivery. A frame's mere existence is insufficient.
  const loadedContent = el => {
    if ([...el.querySelectorAll('img')].some(img => visible(img) && img.complete && img.naturalWidth > 0)) return true;
    if ([...el.querySelectorAll('video')].some(video => visible(video) && video.readyState >= 2 && video.videoWidth > 0)) return true;
    return [...el.querySelectorAll('a[href]')].some(a => visible(a) && /^https?:/.test(a.getAttribute('href')) && a.textContent.trim());
  };
  const deliveredInline = el => {
    const slots = el.matches('[id^="gam-slot-"],.feed-placement__slot') ? [el] : [...el.querySelectorAll('[id^="gam-slot-"],.feed-placement__slot')];
    for (const slot of slots) {
      if (loadedContent(slot)) return true;
      for (const frame of slot.querySelectorAll('iframe')) {
        try {
          if (visible(frame) && frame.contentDocument?.readyState === 'complete' && frame.contentDocument.body && loadedContent(frame.contentDocument.body)) return true;
        } catch { /* Cross-origin or not loaded: evidence remains inconclusive. */ }
      }
    }
    return [...el.querySelectorAll('img')].some(img =>
      /\/images\/premium_spotlights\/.*\/wide_spotlight_premium\.svg/.test(img.getAttribute('src') || '') &&
      visible(img) && img.complete && img.naturalWidth > 0);
  };
  const expected = pageType === 'dashboard' ? ['inline', 'premium', 'marketing']
    : ['newsfeed', 'document'].includes(pageType) ? ['inline'] : [];
  const samples = expected.map(id => {
    const nodes = nodesByComponent[id].filter(visible);
    const delivered = nodes.filter(el => id === 'inline' ? deliveredInline(el) : !!el.textContent.trim() || loadedContent(el));
    return { id, nodes, delivered };
  });
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  try {
    const lostCount = candidates.filter(el => !visible(el)).length;
    const remaining = selectors.reduce((sum, { selector }) => sum + [...document.querySelectorAll(selector)].filter(visible).length, 0);
    const components = samples.map(({ id, nodes, delivered }) => {
      const stillVisible = delivered.filter(visible).length;
      const status = stillVisible ? 'regression' : delivered.length > 0 && delivered.length === nodes.length ? 'observed' : 'inconclusive';
      return { id, status, visibleBefore: nodes.length, contentBefore: delivered.length, remaining: stillVisible };
    });
    return { routeReady: true, protectedCount: candidates.length, lostCount, remaining, matches: counts.reduce((sum, row) => sum + row.visibleBefore, 0), counts, components };
  } finally {
    style.remove();
  }
}
