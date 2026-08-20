import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteDir = path.join(rootDir, 'site');
const allowlistPath = path.join(siteDir, 'runtime-allowlist.json');
const inventoryPath = path.join(rootDir, 'research', 'asset-inventory.json');
const checkOnly = process.argv.includes('--check');
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
const deployed = new Set([...allowlist.staticFiles, ...allowlist.iconFiles]);
const pngFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) pngFiles.push(fullPath);
  }
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

walk(siteDir);
pngFiles.sort();
const hashCounts = new Map();
const files = pngFiles.map(filePath => {
  const relativePath = path.relative(siteDir, filePath).replaceAll(path.sep, '/');
  const bytes = fs.statSync(filePath).size;
  const hash = sha256(filePath);
  hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
  return {
    path: `site/${relativePath}`,
    bytes,
    sha256: hash,
    deployed: deployed.has(relativePath),
    status: deployed.has(relativePath) ? 'runtime-allowlisted' : 'quarantined-not-in-runtime-allowlist',
  };
});

const duplicateBlobCount = [...hashCounts.values()].filter(count => count > 1).reduce((sum, count) => sum + count - 1, 0);
const inventory = {
  schemaVersion: 1,
  generatedBy: 'scripts/check_assets.mjs',
  sourceRoot: 'site/',
  runtimeAllowlist: 'site/runtime-allowlist.json',
  fileCount: files.length,
  deployedFileCount: files.filter(file => file.deployed).length,
  quarantinedFileCount: files.filter(file => !file.deployed).length,
  duplicateBlobCount,
  files,
};

const expected = `${JSON.stringify(inventory, null, 2)}\n`;
if (checkOnly) {
  if (!fs.existsSync(inventoryPath) || fs.readFileSync(inventoryPath, 'utf8').replace(/\r\n/g, '\n') !== expected) {
    console.error('Asset inventory is stale. Run: npm run audit:assets');
    process.exit(1);
  }
  if (inventory.quarantinedFileCount > 0) {
    console.error(`Unallowlisted PNG assets are tracked under site/: ${inventory.quarantinedFileCount}. Remove them or add an explicit runtime allowlist entry before merging.`);
    process.exit(1);
  }
  console.log(`Asset inventory is current: ${files.length} PNG files, ${inventory.deployedFileCount} allowlisted, ${inventory.quarantinedFileCount} quarantined.`);
} else {
  fs.writeFileSync(inventoryPath, expected, 'utf8');
  console.log(`Asset inventory written: ${files.length} PNG files, ${inventory.deployedFileCount} allowlisted, ${inventory.quarantinedFileCount} quarantined.`);
}
