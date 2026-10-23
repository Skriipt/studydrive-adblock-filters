export const defaultDocumentURL = 'https://www.studydrive.net/de/doc/bachelorthesis-note-10-eventmanagement/1778694';

export async function fetchPublicText(url, request = fetch) {
  let response;
  try {
    response = await request(url, { signal: AbortSignal.timeout(25000), redirect: 'error' });
  } catch {
    throw new Error('Request failed retrieving public source');
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} retrieving public source`);
  try {
    return await response.text();
  } catch {
    throw new Error('Response body unavailable for public source');
  }
}

export function studydriveURL(input) {
  const url = new URL(input);
  if (url.origin !== 'https://www.studydrive.net' || url.username || url.password || url.search || url.hash) {
    throw new Error('Expected a public https://www.studydrive.net URL without credentials, query or fragment');
  }
  return url.href;
}

// Discover current hashes on each run; never fetch last week's hard-coded bundle.
export function discoverMain(html, pageURL) {
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)];
  const urls = scripts.map(match => new URL(match[1], pageURL));
  const main = urls.find(url => url.pathname.startsWith('/assets/main-') && url.pathname.endsWith('.js'));
  if (!main) throw new Error('Legacy app entry missing: redirected, inaccessible, or upstream architecture changed');
  return studydriveURL(main.href);
}

export function discoverChunk(main, prefix) {
  const paths = [...main.matchAll(/["'](assets\/[\w/.-]+\.js)["']/g)].map(match => match[1]);
  const matches = [...new Set(paths)].filter(path => path.startsWith(`${prefix}-`));
  if (matches.length !== 1) throw new Error(`Expected one current ${prefix} chunk, found ${matches.length}`);
  return studydriveURL(`https://www.studydrive.net/${matches[0]}`);
}

// Presence checks are drift alarms, not proof that live rendering still works.
export const sourceContracts = [
  { name: 'ad infrastructure and cookie names', entry: true, markers: [
    'pagead2.googlesyndication.com', 'gam-slot-', '/images/premium_spotlights/',
    'wide_spotlight_premium.svg', 'fullpage_video_premium.svg', 'sd_fp_docs_left', 'sd_fp_until',
  ] },
  { name: 'dashboard boundary and lazy widgets', prefix: 'assets/views/Dashboard', markers: [
    'dashboard-index-view', 'name:"LazyLoad"', 'premium-cta', 'banner-ad',
  ] },
  { name: 'newsfeed placement integration', prefix: 'assets/views/NewsfeedIndex', markers: [
    'newsfeed-index-view', 'FeedStickySpotlightGroup', 'feedGroups', 'inFeedSpotlight', 'placement-key',
  ] },
  { name: 'inline placement and replacement image', prefix: 'assets/views/DashboardWidgetBannerSpotlight', markers: [
    'feed-placement', 'feed-placement__slot', 'feed-placement__fallback', 'sd_desk', 'sd_mew',
  ] },
  { name: 'Premium logo and text component', prefix: 'assets/views/DashboardWidgetPremium', markers: [
    'PremiumSpotlight', 'sidebar-logo-studydrive', 'logo-studydrive-premium', '"p",null',
  ] },
  { name: 'marketing container', prefix: 'assets/views/DashboardWidgetBrazeBanner', markers: [
    'dashboard-braze-banner-container',
  ] },
  { name: 'document viewer and fullscreen boundary', prefix: 'assets/views/DocumentShow', markers: [
    'document-pdf-container', 'doc-fullscreen-spotlight', '_doc_fp', 'hasSpotlightObstruction',
  ] },
  { name: 'fullscreen counter consumption', prefix: 'assets/misc/linkify', markers: [
    'DOCS_UNTIL_FULLSCREEN', 'FULLSCREEN_CLOSE_LOCK', 'hasObstruction', 'isOwner', 'Math.max(0,',
  ] },
];

export function checkMarkers(source, markers) {
  return markers.filter(marker => !source.includes(marker));
}

export function observationStatus({ routeReady, protectedCount = 0, lostCount = 0, remaining = 0, components = [] }) {
  if (!routeReady || protectedCount === 0) return 'inconclusive';
  if (lostCount || remaining || components.some(component => component.status === 'regression')) return 'regression';
  return components.length > 0 && components.every(component => component.status === 'observed') ? 'observed' : 'inconclusive';
}

export function observationExitCode(results) {
  if (results.some(result => ['error', 'regression'].includes(result.status))) return 1;
  if (!results.length || results.some(result => result.status !== 'observed')) return 2;
  return 0;
}
