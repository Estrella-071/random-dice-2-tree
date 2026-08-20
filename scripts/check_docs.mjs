import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = [
  'README.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'ARCHITECTURE.md',
  'DATA_MODEL.md',
  'REPRODUCING.md',
  'TESTING.md',
  'DEPLOYMENT.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'SUPPORT.md',
  'GOVERNANCE.md',
  'NOTICE.md',
  'CHANGELOG.md',
  'research/README.md',
  'site/README.md',
  'xlsx_build/README.md',
];
const errors = [];
const linkPattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

for (const relativeDoc of docs) {
  const docPath = path.join(rootDir, relativeDoc);
  if (!fs.existsSync(docPath)) {
    errors.push(`${relativeDoc} is missing`);
    continue;
  }
  const text = fs.readFileSync(docPath, 'utf8');
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
    const cleanTarget = target.split('#', 1)[0].split('?', 1)[0];
    if (!cleanTarget) continue;
    const resolved = path.resolve(path.dirname(docPath), cleanTarget);
    if (!resolved.startsWith(rootDir + path.sep) || !fs.existsSync(resolved)) {
      errors.push(`${relativeDoc} -> ${target}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Documentation link check failed (${errors.length} issue(s)):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Documentation link check passed for ${docs.length} required documents.`);
