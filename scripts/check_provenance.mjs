import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const provenance = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'provenance.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(rootDir, 'site', 'data', 'dice_tree.json'), 'utf8'));
const errors = [];

function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(rootDir, relativePath))).digest('hex').toUpperCase();
}

for (const entry of Object.values(provenance.publishedData || {})) {
  if (!entry || typeof entry !== 'object' || !entry.path || !entry.sha256) continue;
  if (!fs.existsSync(path.join(rootDir, entry.path))) errors.push(`${entry.path} is missing`);
  else if (sha256(entry.path) !== entry.sha256.toUpperCase()) errors.push(`${entry.path} hash differs from data/provenance.json`);
}
if (provenance.publishedData?.nodeCount !== data.summary?.node_count) errors.push('provenance nodeCount does not match data summary');
if (provenance.publishedData?.edgeCount !== data.summary?.edge_count) errors.push('provenance edgeCount does not match data summary');
if (provenance.snapshotId !== 'random-dice-2-ios-1.0.0') errors.push('unexpected snapshotId');

if (errors.length > 0) {
  console.error(`Provenance check failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Provenance check passed for ${provenance.snapshotId}.`);
