import fs from 'node:fs';

const eventName = process.env.GITHUB_EVENT_NAME || 'local';
const forceFull = process.env.CI_FORCE_FULL === 'true' || (eventName !== 'pull_request' && eventName !== 'local');
const files = [...new Set(
  fs.readFileSync(0, 'utf8')
    .split(/\r?\n/)
    .map(file => file.trim())
    .filter(Boolean),
)].sort();

const documentationOnly = file => [
  /^[^/]+\.(?:md|cff)$/i,
  /^LICENSE$/i,
  /^\.github\/(?:dependabot\.yml|pull_request_template\.md|ISSUE_TEMPLATE\/[^/]+\.(?:md|yml))$/i,
  /^site\/README\.md$/i,
].some(pattern => pattern.test(file));

const browserRelevant = file => (
  file === 'verify_suite.mjs'
  || file === 'package.json'
  || file === 'package-lock.json'
  || file.startsWith('.github/workflows/')
  || file.startsWith('site/') && !file.endsWith('.md')
  || file === 'scripts/build_pages.mjs'
  || file === 'scripts/ci_scope.mjs'
  || file === 'scripts/ci_scope_test.mjs'
  || file === 'scripts/sync_site_data.mjs'
  || file === 'scripts/verify_local.mjs'
);

const docsOnly = !forceFull && files.length > 0 && files.every(documentationOnly);
const full = forceFull || files.length === 0 || !docsOnly;
const browser = forceFull || files.length === 0 || files.some(browserRelevant);

const outputs = {
  full: String(full),
  browser: String(browser),
  docs_only: String(docsOnly),
  changed_count: String(files.length),
};

const outputPath = process.env.GITHUB_OUTPUT;
if (outputPath) {
  fs.appendFileSync(outputPath, `${Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join('\n')}\n`);
}

console.log(`CI scope: ${files.length} changed file(s); full=${full}; browser=${browser}; docs-only=${docsOnly}`);
