import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseFilters, readFilters, filterFile } from '../scripts/filters.mjs';
import { discoverMain, discoverChunk, checkMarkers, observationStatus, observationExitCode, studydriveURL, fetchPublicText, sourceContracts } from '../scripts/upstream.mjs';

test('network and scriptlet scope stays limited to the existing ad contract', async () => {
  const rules = await readFilters();
  assert.deepEqual(rules.filter(rule => rule.type === 'network').map(rule => rule.host).sort(), [
    'pagead2.googlesyndication.com', 'securepubads.g.doubleclick.net',
  ]);
  assert.deepEqual(rules.filter(rule => rule.type === 'cookie').map(({ name, value }) => [name, value]), [
    ['sd_fp_docs_left', '32767'], ['sd_fp_until', '0'],
  ]);
  const source = await readFile(filterFile, 'utf8');
  assert.match(source, /^! Version: \d{4}\.\d{2}\.\d{2}\.\d+$/m);
  assert.match(source, /^! Expires: 1 day$/m);
});

test('unsupported, unscoped and duplicated rules cannot silently escape validation', () => {
  for (const filter of ['##.advert', 'studydrive.net##+js(set-cookie, sd_at, 1)', 'studydrive.net##+js(set-cookie, sd_fp_until, 99999)', '||example.com^']) {
    assert.throws(() => parseFilters(`! Rule: invalid\n${filter}`));
  }
  assert.throws(() => parseFilters('! Rule: same\nstudydrive.net##.ad\n! Rule: same\nstudydrive.net##.other'));
  assert.throws(() => parseFilters('! Rule: one\nstudydrive.net##.ad\n! Rule: two\nstudydrive.net##.ad'));
  assert.throws(() => parseFilters('! Rule: missing'));
});

test('upstream discovery follows changed asset hashes and rejects missing or ambiguous entries', () => {
  const url = 'https://www.studydrive.net/de/doc/example/123';
  assert.equal(discoverMain('<script type="module" src="/assets/main-NEW123.js"></script>', url), 'https://www.studydrive.net/assets/main-NEW123.js');
  assert.equal(discoverChunk('"assets/views/Dashboard-NEW.js","assets/views/DashboardWidgetPremium-OTHER.js"', 'assets/views/Dashboard'), 'https://www.studydrive.net/assets/views/Dashboard-NEW.js');
  assert.throws(() => discoverMain('<html>Login</html>', url));
  assert.throws(() => discoverChunk('"assets/views/Dashboard-A.js","assets/views/Dashboard-B.js"', 'assets/views/Dashboard'));
  assert.throws(() => studydriveURL('https://example.com/assets/main.js'));
  assert.throws(() => studydriveURL('https://www.studydrive.net/de?token=private'));
  assert.deepEqual(checkMarkers('feed-placement', ['feed-placement', 'sd_fp_until']), ['sd_fp_until']);
});

test('absent ads, missing views, and mixed results never become successful observations', () => {
  const baseline = { routeReady: true, protectedCount: 5, matches: 2, lostCount: 0, remaining: 0, components: [{ id: 'inline', status: 'observed' }] };
  assert.equal(observationStatus(baseline), 'observed');
  assert.equal(observationStatus({ ...baseline, components: [] }), 'inconclusive');
  assert.equal(observationStatus({ ...baseline, components: [...baseline.components, { id: 'premium', status: 'inconclusive' }] }), 'inconclusive');
  assert.equal(observationStatus({ ...baseline, components: [...baseline.components, { id: 'premium', status: 'regression' }] }), 'regression');
  assert.equal(observationStatus({ ...baseline, routeReady: false }), 'inconclusive');
  assert.equal(observationStatus({ ...baseline, protectedCount: 0 }), 'inconclusive');
  assert.equal(observationStatus({ ...baseline, lostCount: 1 }), 'regression');
  assert.equal(observationStatus({ ...baseline, remaining: 1 }), 'regression');
  assert.equal(observationExitCode([]), 2);
  assert.equal(observationExitCode([{ status: 'observed' }, { status: 'inconclusive' }]), 2);
  assert.equal(observationExitCode([{ status: 'regression' }, { status: 'inconclusive' }]), 1);
  assert.equal(observationExitCode([{ status: 'observed' }]), 0);
});

test('source errors never include a supplied document path or request error detail', async () => {
  const privateURL = 'https://www.studydrive.net/de/doc/private-title/123';
  await assert.rejects(fetchPublicText(privateURL, async () => ({ ok: false, status: 404 })), {
    message: 'HTTP 404 retrieving public source',
  });
  await assert.rejects(fetchPublicText(privateURL, async () => { throw new Error(`Failed: ${privateURL}`); }), {
    message: 'Request failed retrieving public source',
  });
  await assert.rejects(fetchPublicText(privateURL, async () => ({ ok: true, text() { throw new Error(privateURL); } })), {
    message: 'Response body unavailable for public source',
  });
});

test('newsfeed integration drift is checked independently of the ad component', () => {
  const contract = sourceContracts.find(c => c.prefix === 'assets/views/NewsfeedIndex');
  assert.ok(contract, 'NewsfeedIndex must be inspected');
  const integration = 'newsfeed-index-view FeedStickySpotlightGroup feedGroups inFeedSpotlight placement-key';
  assert.deepEqual(checkMarkers(integration, contract.markers), []);
  assert.deepEqual(checkMarkers(integration.replace('FeedStickySpotlightGroup', 'NewLayout'), contract.markers), ['FeedStickySpotlightGroup']);
});
