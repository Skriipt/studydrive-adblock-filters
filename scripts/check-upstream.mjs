import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { defaultDocumentURL, studydriveURL, discoverMain, discoverChunk, sourceContracts, checkMarkers, fetchPublicText } from './upstream.mjs';

const report = { checkedAt: new Date().toISOString(), scope: 'public source markers, not live blocking', status: 'ok', checks: [] };

try {
  const documentURL = studydriveURL(process.env.STUDYDRIVE_DOCUMENT_URL || defaultDocumentURL);
  const mainURL = discoverMain(await fetchPublicText(documentURL), documentURL);
  const main = await fetchPublicText(mainURL);
  for (const contract of sourceContracts) {
    const url = contract.entry ? mainURL : discoverChunk(main, contract.prefix);
    const source = contract.entry ? main : await fetchPublicText(url);
    const missing = checkMarkers(source, contract.markers);
    report.checks.push({ name: contract.name, url, sha256: createHash('sha256').update(source).digest('hex'), missing });
    if (missing.length) report.status = 'drift';
  }
} catch (error) {
  report.status = 'error';
  report.error = error.message;
}
await mkdir('test-results', { recursive: true });
await writeFile('test-results/upstream.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.status === 'ok' ? 0 : 1;
