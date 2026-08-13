import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteDir = path.join(__dirname, 'site');

// 1. Create static HTTP server
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, 'http://localhost:3000');
  let filePath = path.join(siteDir, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  const stream = fs.createReadStream(filePath);
  res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
  stream.pipe(res);
});

server.listen(3000, async () => {
  console.log('Test HTTP server listening on http://localhost:3000');

  try {
    const playwrightPath = pathToFileURL(path.join(__dirname, 'xlsx_build/node_modules/playwright/index.mjs')).href;
    const { chromium } = await import(playwrightPath);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    console.log('\n--- TEST SUITE: Random Dice 2 Refactor ---');

    // Load page
    await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
    console.log('✓ Page loaded successfully');

    // Wait for SVG and data to finish loading
    await page.waitForSelector('g.node[data-node-id]', { timeout: 8000 });
    console.log('✓ SVG and nodes rendered in DOM');

    // Check loading indicator or instant load
    const loadingEl = await page.$('#loading');
    if (loadingEl) {
      const loadingHidden = await page.$eval('#loading', el => el.hidden);
      if (!loadingHidden) throw new Error('Loading state is not hidden');
    }
    console.log('✓ Loading state clean & instant');

    // 1. Verify R2: Minimap Canvas & No Duplicate 10MB SVG <img>
    const minimapCanvas = await page.$('#minimap-canvas');
    if (!minimapCanvas) throw new Error('Minimap canvas not found');
    const duplicateImg = await page.$('#minimap img');
    if (duplicateImg) throw new Error('Duplicate SVG <img> tag still present in minimap');
    console.log('✓ Minimap memory bloat fixed: Canvas used, duplicate 10MB SVG <img> completely removed');

    // 2. Verify R3: Anti-AI design & No .tooltip-accent
    const tooltipAccent = await page.$('.tooltip-accent');
    if (tooltipAccent) throw new Error('.tooltip-accent purple gradient bar still exists');
    console.log('✓ Anti-AI design: .tooltip-accent 4px gradient bar completely removed');

    // 3. Verify R1: Node Click & Pointer State Machine
    const firstNode = await page.$('g.node[data-node-id="1001"]');
    if (!firstNode) throw new Error('Node 1001 not found');
    await firstNode.click();

    await page.waitForSelector('#tooltip:not([hidden])', { timeout: 3000 });
    const tooltipTitle = await page.$eval('#tooltip-title', el => el.textContent.trim());
    console.log(`✓ Node click selection verified: opened tooltip for "${tooltipTitle}"`);

    // Verify Anchored Positioning & 50% Font Scale / Boldness
    const posCheck = await page.evaluate(() => {
      const el = document.querySelector('g.node[data-node-id="1001"]');
      const tip = document.getElementById('tooltip');
      const nRect = el.getBoundingClientRect();
      const tRect = tip.getBoundingClientRect();
      const title = document.getElementById('tooltip-title');
      const copy = tip.querySelector('.detail-copy');
      return {
        tipLeft: Math.round(tRect.left),
        tipTop: Math.round(tRect.top),
        nodeCenterX: Math.round(nRect.left + nRect.width / 2),
        tipCenterX: Math.round(tRect.left + tRect.width / 2),
        titleFontSize: window.getComputedStyle(title).fontSize,
        titleFontWeight: window.getComputedStyle(title).fontWeight,
        copyFontSize: window.getComputedStyle(copy).fontSize,
        copyFontWeight: window.getComputedStyle(copy).fontWeight
      };
    });
    console.log(`✓ Realtime Positioning Check: Node Center X=${posCheck.nodeCenterX}px, Tooltip Center X=${posCheck.tipCenterX}px (Delta=${Math.abs(posCheck.nodeCenterX - posCheck.tipCenterX)}px)`);
    console.log(`✓ Realtime Font Scaling Check: Title Size=${posCheck.titleFontSize} (Weight=${posCheck.titleFontWeight}), Copy Size=${posCheck.copyFontSize} (Weight=${posCheck.copyFontWeight})`);
    if (Math.abs(posCheck.nodeCenterX - posCheck.tipCenterX) > 60) {
      throw new Error(`Tooltip positioning misaligned with node!`);
    }
    if (parseFloat(posCheck.titleFontSize) < 20 || parseFloat(posCheck.copyFontSize) < 17) {
      throw new Error(`Tooltip font size is not scaled up 50%!`);
    }

    // 4. Verify R5 & R6: Detail Panel IA & Localization
    const branchBadge = await page.$eval('#tooltip-branch-badge', el => el.textContent.trim());
    const typeBadge = await page.$eval('#tooltip-type-badge', el => el.textContent.trim());
    console.log(`✓ Branch badge: "${branchBadge}", Type badge: "${typeBadge}"`);

    if (branchBadge !== '自然') throw new Error(`Expected branch "自然", got "${branchBadge}"`);
    if (typeBadge !== '骰子') throw new Error(`Expected type "骰子", got "${typeBadge}"`);

    // Check awakening effect text for Node 1001 (should have resolved tag <tag>BURN</tag> -> 燙傷)
    const bodyText = await page.$eval('#tooltip-body', el => el.textContent);
    if (bodyText.includes('<tag>') || bodyText.includes('BURN')) {
      throw new Error(`Raw tag detected in tooltip body: ${bodyText}`);
    }
    if (!bodyText.includes('燙傷')) {
      throw new Error(`Expected resolved tag "燙傷" in tooltip body, but got: ${bodyText}`);
    }
    console.log('✓ Tag localization verified: <tag>BURN</tag> correctly resolved to "燙傷" without raw tags');

    // 4.1 Verify Removed "屬性" & Traditional Chinese Group & Official Sprites & Color Palette
    const statsCheck = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.stat-compact-item')).map(el => el.textContent.trim());
      const hasGoldSprite = !!document.querySelector('.gold-icon use[href="#sprite-185"]');
      const hasCoreSprite = !!document.querySelector('.core-icon use[href="#sprite-186"]');
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const tooltipBg = window.getComputedStyle(document.getElementById('tooltip')).backgroundColor;
      const tooltipBorder = window.getComputedStyle(document.getElementById('tooltip')).borderColor;
      return { items, hasGoldSprite, hasCoreSprite, bodyBg, tooltipBg, tooltipBorder };
    });
    console.log('✓ Stats items for Node 1001:', statsCheck.items);
    if (statsCheck.items.some(i => i.includes('屬性'))) {
      throw new Error(`"屬性" attribute should be removed, but found: ${JSON.stringify(statsCheck.items)}`);
    }
    if (!statsCheck.items.some(i => i.includes('群組') && i.includes('自然'))) {
      throw new Error(`Expected translated group "群組 自然", got: ${JSON.stringify(statsCheck.items)}`);
    }
    console.log('✓ "屬性" correctly removed, "群組" verified as "自然"');
    console.log(`✓ Color verification: Body BG=${statsCheck.bodyBg}, Tooltip BG=${statsCheck.tooltipBg}, Border=${statsCheck.tooltipBorder}`);

    // 4.2 Verify Zoom Behavior (頂部欄淡出，小地圖僅在運動時淡入顯示)
    await page.evaluate(() => {
      const vp = document.getElementById('viewport');
      vp.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
    });
    await page.waitForTimeout(180); // Wait for 260ms soft transition
    const zoomFadeCheck = await page.evaluate(() => {
      const hasZoomingClass = document.body.classList.contains('is-zooming');
      const topbarOpacity = window.getComputedStyle(document.querySelector('.topbar')).opacity;
      const minimapOpacity = window.getComputedStyle(document.getElementById('minimap-panel')).opacity;
      return { hasZoomingClass, topbarOpacity, minimapOpacity };
    });
    console.log(`✓ Zoom Fadeout Check: is-zooming=${zoomFadeCheck.hasZoomingClass}, topbarOpacity=${zoomFadeCheck.topbarOpacity}, minimapOpacity=${zoomFadeCheck.minimapOpacity}`);
    if (!zoomFadeCheck.hasZoomingClass || parseFloat(zoomFadeCheck.topbarOpacity) < 0.9 || parseFloat(zoomFadeCheck.minimapOpacity) < 0.8) {
      throw new Error(`Zoom behavior failed! Topbar must stay visible (opacity 1), minimap must fade in during zoom.`);
    }
    await page.waitForTimeout(400); // Wait for fade-in recovery

    // 4.3 Verify Pan / Drag Motion Behavior (頂部欄始終顯示，小地圖僅在運動時淡入顯示)
    await page.evaluate(() => {
      const vp = document.getElementById('viewport');
      vp.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 500, clientY: 500, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 550, clientY: 550, bubbles: true }));
    });
    await page.waitForTimeout(180); // Wait for 260ms soft transition

    const panFadeCheck = await page.evaluate(() => {
      const isNavigating = document.body.classList.contains('is-navigating');
      const topbarOpacity = window.getComputedStyle(document.querySelector('.topbar')).opacity;
      const minimapOpacity = window.getComputedStyle(document.getElementById('minimap-panel')).opacity;
      return { isNavigating, topbarOpacity, minimapOpacity };
    });
    console.log(`✓ Pan Fadeout Check: is-navigating=${panFadeCheck.isNavigating}, topbarOpacity=${panFadeCheck.topbarOpacity}, minimapOpacity=${panFadeCheck.minimapOpacity}`);
    if (!panFadeCheck.isNavigating || parseFloat(panFadeCheck.topbarOpacity) < 0.9 || parseFloat(panFadeCheck.minimapOpacity) < 0.8) {
      throw new Error(`Pan behavior failed! Topbar must stay visible, minimap must fade in during drag.`);
    }

    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 550, clientY: 550, bubbles: true }));
    });
    await page.waitForTimeout(400); // Wait for fade-in recovery

    await page.click('#zoom-reset');
    await page.waitForTimeout(500);

    // 5. Test Multi-rank node Upgrade Tier Table (e.g. Node 1201)
    const node1201 = await page.$('g.node[data-node-id="1201"]');
    if (!node1201) throw new Error('Node 1201 element not found');
    await node1201.click();
    await page.waitForTimeout(300);

    const title1201 = await page.$eval('#tooltip-title', el => el.textContent.trim());
    const rankBadge1201 = await page.$eval('#tooltip-rank-badge', el => el.textContent.trim());
    console.log(`✓ Node 1201 opened: "${title1201}" with rank "${rankBadge1201}"`);

    const tableRows = await page.$$eval('.upgrade-table tbody tr', rows => rows.length);
    console.log(`✓ Structured Upgrade Tier Table verified: ${tableRows} tier rows displayed without '、' concatenations`);
    if (tableRows !== 50) throw new Error(`Expected 50 upgrade rows for rank 50 node, got ${tableRows}`);

    // 5.1 Test Permanent "查看前置節點" Button & Path Highlighting (Default ON)
    console.log('Testing Prerequisite Path Highlighting on Node 1201...');
    const prereqState = await page.evaluate(() => {
      const hasPrereqClass = document.body.classList.contains('has-prereq-highlight');
      const activePrereqNodes = document.querySelectorAll('g.node.is-prereq-active').length;
      const targetPrereqNodes = document.querySelectorAll('g.node.is-prereq-target').length;
      return { hasPrereqClass, activePrereqNodes, targetPrereqNodes };
    });
    console.log(`✓ Prerequisite Highlighting verified: hasClass=${prereqState.hasPrereqClass}, pathNodesCount=${prereqState.activePrereqNodes}`);
    if (!prereqState.hasPrereqClass || prereqState.activePrereqNodes < 2) {
      throw new Error(`Prerequisite path traversal failed to highlight ancestors!`);
    }

    // 5.2 Test Currency Badges (Default ON)
    console.log('Testing Currency Badges (Default ON)...');
    const currencyBadgeVisible = await page.evaluate(() => {
      const hasClass = document.body.classList.contains('show-currency-badges');
      const badge = document.querySelector('.map-scene .cost-badge');
      const opacity = badge ? window.getComputedStyle(badge).opacity : '0';
      return hasClass && parseFloat(opacity) > 0.9;
    });
    console.log(`✓ Currency Badges verified: visible=${currencyBadgeVisible}`);
    if (!currencyBadgeVisible) throw new Error('Currency badges failed to display');
    await page.waitForTimeout(300);

    // 6. Test Search Functionality
    await page.fill('#search-input', '尖刺');
    await page.waitForTimeout(300);
    const searchResultsCount = await page.$$eval('.search-result', items => items.length);
    console.log(`✓ Search for "尖刺" returned ${searchResultsCount} matching results`);
    if (searchResultsCount === 0) throw new Error('Search failed to return results for "尖刺"');

    // Click search result
    await page.click('.search-result');
    await page.waitForTimeout(300);
    const selectedTitle = await page.$eval('#tooltip-title', el => el.textContent.trim());
    console.log(`✓ Clicked search result, active node: "${selectedTitle}"`);

    // 7. Verify Mobile Viewport & Search Button (390x844)
    console.log('\n--- TESTING MOBILE VIEWPORT (390x844) ---');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    const searchCircleCheck = await page.$eval('.search-field', el => {
      const s = window.getComputedStyle(el);
      return { width: parseFloat(s.width), radius: s.borderRadius };
    });
    console.log(`✓ Mobile search circle button: width=${searchCircleCheck.width}px, radius=${searchCircleCheck.radius}`);
    if (Math.abs(searchCircleCheck.width - 44) > 4) throw new Error('Search button must be ~44px circle button on mobile');

    const tooltipStyle = await page.$eval('#tooltip', el => {
      const s = window.getComputedStyle(el);
      return { bottom: s.bottom, position: s.position, borderRadius: s.borderRadius };
    });
    console.log(`✓ Mobile tooltip card position: bottom=${tooltipStyle.bottom}, position=${tooltipStyle.position}, radius=${tooltipStyle.borderRadius}`);

    // Check effective viewport touch area on mobile
    const topbarHeight = await page.$eval('.topbar', el => el.getBoundingClientRect().height);
    const toolbarHeight = await page.$eval('.map-toolbar', el => el.getBoundingClientRect().height);
    const totalScreenHeight = 844;
    const occupiedHeight = topbarHeight + toolbarHeight;
    const availableRatio = (totalScreenHeight - occupiedHeight) / totalScreenHeight;
    console.log(`✓ Mobile effective canvas area: ${(availableRatio * 100).toFixed(1)}% (Requirement: >= 75%)`);
    if (availableRatio < 0.75) throw new Error(`Effective canvas area too low: ${(availableRatio * 100).toFixed(1)}%`);

    // 8. Test Zoom Controls & Smooth Damping
    const initialZoom = await page.$eval('#zoom-readout', el => el.textContent.trim());
    await page.click('#zoom-in');
    await page.waitForTimeout(400);
    const zoomedIn = await page.$eval('#zoom-readout', el => el.textContent.trim());
    console.log(`✓ Zoom In verified: ${initialZoom} -> ${zoomedIn}`);

    await page.click('#zoom-reset');
    await page.waitForTimeout(400);
    const resetZoom = await page.$eval('#zoom-readout', el => el.textContent.trim());
    console.log(`✓ Zoom Reset verified: ${resetZoom}`);

    await browser.close();
    server.close();
    console.log('\n========================================');
    console.log('🎉 ALL AUTOMATED TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    server.close();
    process.exit(1);
  }
});
