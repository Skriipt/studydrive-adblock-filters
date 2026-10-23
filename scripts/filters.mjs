import { readFile } from 'node:fs/promises';

export const filterFile = new URL('../studydrive-ublock.txt', import.meta.url);

// Deliberately limited to this list's syntax. Unknown syntax fails instead of
// silently skipping rules or pretending to be a complete blocker implementation.
export function parseFilters(source) {
  const rules = [];
  const ids = new Set();
  const lines = new Set();
  let id;
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (line.startsWith('! Rule: ')) {
      if (id) throw new Error(`Rule ${id} has no filter`);
      id = line.slice(8);
      continue;
    }
    if (!line || line.startsWith('!') || line === '[Adblock Plus 2.0]') continue;
    if (!id || !/^[a-z][a-z0-9-]+$/.test(id) || ids.has(id) || lines.has(line)) {
      throw new Error(`Missing/duplicate rule ID or duplicate filter at line ${index + 1}`);
    }
    let rule;
    const cookie = line.match(/^studydrive\.net##\+js\(set-cookie, (sd_fp_docs_left|sd_fp_until), (\d+)\)$/);
    const network = line.match(/^\|\|([a-z0-9.-]+)\^\$domain=studydrive\.net$/);
    if (cookie) {
      if (Number(cookie[2]) > 32767) throw new Error(`Unsupported set-cookie value in ${id}`);
      rule = { type: 'cookie', name: cookie[1], value: cookie[2] };
    } else if (network) {
      rule = { type: 'network', host: network[1] };
    } else if (line.startsWith('studydrive.net##') && !line.includes('+js(')) {
      const selector = line.slice('studydrive.net##'.length);
      if (/[{}\n]/.test(selector)) throw new Error(`Invalid selector in ${id}`);
      rule = { type: 'cosmetic', selector };
    } else {
      throw new Error(`Unsupported or unscoped filter at line ${index + 1}: ${line}`);
    }
    rules.push({ id, line, ...rule });
    ids.add(id);
    lines.add(line);
    id = undefined;
  }
  if (id) throw new Error(`Rule ${id} has no filter`);
  if (!rules.length) throw new Error('Empty filter list');
  return rules;
}

export async function readFilters() {
  return parseFilters(await readFile(filterFile, 'utf8'));
}

export function cosmeticCSS(rules) {
  return rules.filter(rule => rule.type === 'cosmetic')
    .map(rule => `${rule.selector} { display: none !important; }`).join('\n');
}
