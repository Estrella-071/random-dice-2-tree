import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(rootDir, 'site', 'data', 'dice_tree.json');
const schemaPath = path.join(rootDir, 'schema', 'dice-tree.schema.json');
const siteDir = path.join(rootDir, 'site');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const svgText = fs.readFileSync(path.join(siteDir, 'data', 'dice_tree.svg'), 'utf8');

const errors = [];
const nodes = Array.isArray(data.nodes) ? data.nodes : [];
const nodeIds = new Set(nodes.map(node => node.id));
const branchNames = new Set(['自然', '工學', '魔法', '秩序', '渾沌']);
const nodeTypes = new Set(['DICE', 'DICE_RUNE', 'PLAYER_PASSIVE', 'PERK']);
const publicIconNames = new Set(fs.readdirSync(path.join(siteDir, 'icons')));

function fail(message) {
  errors.push(message);
}

function validateSpecialStatIcons(value, context = 'data') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateSpecialStatIcons(entry, `${context}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value.special_stats)) {
    value.special_stats.forEach((stat, index) => {
      const icon = stat?.icon;
      if (icon === undefined) return;
      if (typeof icon !== 'string' || !/^[A-Za-z0-9_.-]+\.png$/.test(icon)) {
        fail(`${context}.special_stats[${index}].icon is not a safe PNG filename`);
      } else if (!publicIconNames.has(icon)) {
        fail(`${context}.special_stats[${index}].icon does not match an exact site/icons filename: ${icon}`);
      }
    });
  }
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'special_stats') validateSpecialStatIcons(child, `${context}.${key}`);
  }
}

if (!schema.$id || !schema.properties?.nodes) fail('schema/dice-tree.schema.json is incomplete');
else {
  const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  if (!validateSchema(data)) {
    for (const issue of validateSchema.errors || []) {
      errors.push(`schema${issue.instancePath || '/'} ${issue.message}`);
    }
  }
}
validateSpecialStatIcons(data.nodes, 'nodes');
if (!data.summary || !Array.isArray(data.nodes)) fail('root must contain summary and nodes');
if (/<script\b|\son[a-z]+\s*=|javascript:/i.test(svgText)) fail('SVG contains script, event-handler, or javascript URL content');
if (data.summary?.node_count !== nodes.length) fail(`summary.node_count=${data.summary?.node_count} but nodes=${nodes.length}`);

const typeCounts = Object.create(null);
const branchCounts = Object.create(null);
let edgeCount = 0;

for (const node of nodes) {
  if (!node || typeof node !== 'object') {
    fail('nodes contains a non-object entry');
    continue;
  }
  if (!node.id || typeof node.id !== 'string') fail('every node needs a string id');
  if (nodeIds.size !== nodes.length) fail('node ids must be unique');
  if (!Number.isInteger(node.branch) || node.branch < 1 || node.branch > 5) fail(`invalid branch for ${node.id}`);
  if (!branchNames.has(node.branch_zh)) fail(`invalid canonical branch_zh for ${node.id}: ${node.branch_zh}`);
  if (!nodeTypes.has(node.node_type)) fail(`invalid node_type for ${node.id}: ${node.node_type}`);
  if (!Array.isArray(node.incoming) || !Array.isArray(node.next_nodes)) fail(`edge arrays missing for ${node.id}`);

  typeCounts[node.node_type] = (typeCounts[node.node_type] || 0) + 1;
  branchCounts[String(node.branch)] = (branchCounts[String(node.branch)] || 0) + 1;
  edgeCount += node.next_nodes?.length || 0;

  const iconFile = node.icon_file;
  if (typeof iconFile !== 'string' || !iconFile.startsWith('icons/')) {
    fail(`icon_file must use the public icons/ path for ${node.id}: ${iconFile}`);
  } else {
    const iconPath = path.resolve(siteDir, iconFile);
    const iconsRoot = path.resolve(siteDir, 'icons') + path.sep;
    if (!iconPath.startsWith(iconsRoot)) fail(`icon_file escapes site/icons for ${node.id}: ${iconFile}`);
    else if (!fs.existsSync(iconPath)) fail(`icon_file does not exist for ${node.id}: ${iconFile}`);
  }

  for (const target of [...(node.incoming || []), ...(node.next_nodes || [])]) {
    if (!nodeIds.has(target)) fail(`edge ${node.id} -> ${target} references an unknown node`);
    if (target === node.id) fail(`node ${node.id} has a self-edge`);
  }
}

if (data.summary?.edge_count !== edgeCount) fail(`summary.edge_count=${data.summary?.edge_count} but next_nodes=${edgeCount}`);
for (const [key, expected] of Object.entries(data.summary?.nodes_by_type || {})) {
  if (typeCounts[key] !== expected) fail(`nodes_by_type.${key}=${expected} but counted ${typeCounts[key] || 0}`);
}
for (const [key, expected] of Object.entries(data.summary?.nodes_by_branch || {})) {
  if (branchCounts[key] !== expected) fail(`nodes_by_branch.${key}=${expected} but counted ${branchCounts[key] || 0}`);
}

if (errors.length > 0) {
  console.error(`Data validation failed (${errors.length} issue(s)):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Data validation passed: ${nodes.length} nodes, ${edgeCount} directed edges, ${Object.keys(typeCounts).length} node types.`);
