import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteDir = path.join(rootDir, 'site');
const stagingDir = path.join(rootDir, '.pages');
const allowlistPath = path.join(siteDir, 'runtime-allowlist.json');
const writeAllowlist = process.argv.includes('--write-allowlist');

const staticFiles = [
  'index.html',
  'app.js',
  'styles.css',
  'favicon.svg',
  'data/tree_data.js',
  'data/tree_svg.js',
];

const data = JSON.parse(fs.readFileSync(path.join(siteDir, 'data', 'dice_tree.json'), 'utf8'));
const appText = fs.readFileSync(path.join(siteDir, 'app.js'), 'utf8');
const iconFiles = new Set();
for (const node of data.nodes || []) {
  if (typeof node.icon_file === 'string') iconFiles.add(node.icon_file.replace(/^sprite_icons\//, 'icons/'));
}
const collectSpecialStatIcons = value => {
  if (Array.isArray(value)) {
    value.forEach(collectSpecialStatIcons);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value.special_stats)) {
    for (const stat of value.special_stats) {
      if (typeof stat?.icon !== 'string') continue;
      if (!/^[A-Za-z0-9_.-]+\.png$/.test(stat.icon)) {
        throw new Error(`Unsafe dynamic icon filename in dice-tree data: ${stat.icon}`);
      }
      iconFiles.add(`icons/${stat.icon}`);
    }
  }
  Object.values(value).forEach(collectSpecialStatIcons);
};
collectSpecialStatIcons(data.nodes);
for (const match of appText.matchAll(/icons\/([A-Za-z0-9_.-]+\.png)/g)) iconFiles.add(`icons/${match[1]}`);
const aliasBlock = appText.match(/const DICE_3_ALIASES\s*=\s*\{([\s\S]*?)\n\s*\};/);
for (const match of aliasBlock?.[1]?.matchAll(/:\s*"([A-Za-z0-9_.-]+\.png)"/g) || []) iconFiles.add(`icons/${match[1]}`);
iconFiles.add('icons/NodeAttackIcon.png');

const expectedAllowlist = {
  version: 1,
  sourceOfTruth: 'site/data/dice_tree.json and site/data/dice_tree.svg',
  staticFiles,
  iconFiles: [...iconFiles].sort(),
};

if (!fs.existsSync(allowlistPath) || writeAllowlist) {
  fs.writeFileSync(allowlistPath, `${JSON.stringify(expectedAllowlist, null, 2)}\n`, 'utf8');
} else {
  const actualAllowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  if (JSON.stringify(actualAllowlist) !== JSON.stringify(expectedAllowlist)) {
    console.error('site/runtime-allowlist.json is stale. Run: node scripts/build_pages.mjs --write-allowlist');
    process.exit(1);
  }
}

const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
const files = [...allowlist.staticFiles, ...allowlist.iconFiles];
const missing = files.filter(relativePath => {
  const resolved = path.resolve(siteDir, relativePath);
  if (!resolved.startsWith(`${siteDir}${path.sep}`) || !fs.existsSync(resolved)) return true;
  const directoryEntries = fs.readdirSync(path.dirname(resolved));
  return !fs.statSync(resolved).isFile() || !directoryEntries.includes(path.basename(resolved));
});
if (missing.length > 0) {
  console.error(`Runtime allowlist references missing files:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}

fs.rmSync(stagingDir, { recursive: true, force: true });
for (const relativePath of files) {
  const source = path.resolve(siteDir, relativePath);
  const destination = path.join(stagingDir, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
fs.writeFileSync(path.join(stagingDir, 'runtime-manifest.json'), `${JSON.stringify({ ...allowlist, files }, null, 2)}\n`, 'utf8');
console.log(`Pages staging built: ${files.length} files in ${path.relative(rootDir, stagingDir)}.`);
