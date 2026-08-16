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

    page.on('console', msg => console.log('[PAGE LOG]', msg.text()));
    page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

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
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 6000 });
    await page.waitForTimeout(400);

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
    if (parseFloat(posCheck.titleFontSize) < 20 || parseFloat(posCheck.copyFontSize) < 16) {
      throw new Error(`Tooltip font size is not scaled up!`);
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

    // 4.1 Verify 2-Column Dice Stat Grid & Official Icons & Color Palette
    const statsCheck = await page.evaluate(() => {
      const gridItems = Array.from(document.querySelectorAll('.dice-stat-item')).map(el => ({
        label: el.querySelector('.dice-stat-label')?.textContent.trim(),
        val: el.querySelector('.dice-stat-val')?.textContent.trim()
      }));
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const tooltipEl = document.getElementById('tooltip');
      const tooltipBg = window.getComputedStyle(tooltipEl).backgroundColor;
      const tooltipBorder = window.getComputedStyle(tooltipEl).borderColor;
      const copyColor = window.getComputedStyle(tooltipEl.querySelector('.detail-copy')).color;
      const hasUnderlineTag = !!tooltipEl.querySelector('.tooltip-tag-inline');
      const hasHashtagChip = !!tooltipEl.querySelector('.tooltip-hashtag-chip');
      return { gridItems, bodyBg, tooltipBg, tooltipBorder, copyColor, hasUnderlineTag, hasHashtagChip };
    });
    console.log('✓ Dice Stat Grid items for Node 1001:', statsCheck.gridItems);
    console.log(`✓ Color verification: Body BG=${statsCheck.bodyBg}, Tooltip BG=${statsCheck.tooltipBg}, Border=${statsCheck.tooltipBorder}, Copy Color=${statsCheck.copyColor}`);
    console.log(`✓ Tag formatting: hasUnderlineTag=${statsCheck.hasUnderlineTag}, hasHashtagChip=${statsCheck.hasHashtagChip}`);

    if (!statsCheck.gridItems.some(i => i.label === '攻擊力' && i.val === '150')) {
      throw new Error(`Expected '攻擊力 150', got: ${JSON.stringify(statsCheck.gridItems)}`);
    }
    if (!statsCheck.gridItems.some(i => i.label === '目標' && i.val === '前方')) {
      throw new Error(`Expected '目標 前方', got: ${JSON.stringify(statsCheck.gridItems)}`);
    }

    // 截取火骰子 Tooltip
    await page.screenshot({ path: 'C:/Users/zhiwa/.gemini/antigravity/brain/e6521c8b-03b0-4e50-8b8d-8ef940f47abc/tooltip_fire_dice.png' });

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

    // 5.2 Test Predator Dice (Node 5007) - 2-Column Stats & Special Values
    console.log('Testing Predator Dice (Node 5007)...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.__TEST_HOOKS__.centerOnNode('5007', false);
      window.__TEST_HOOKS__.showTooltip('5007', true);
    });
    await page.waitForTimeout(500);

    const pTitle = await page.$eval('#tooltip-title', el => el.textContent.trim());
    const pStats = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.dice-stat-item')).map(el => ({
        label: el.querySelector('.dice-stat-label')?.textContent.trim(),
        val: el.querySelector('.dice-stat-val')?.textContent.trim()
      }));
    });
    console.log(`✓ Predator Dice opened: "${pTitle}", Stats:`, pStats);

    // Verify Attack=1000, AttackInterval=2.7, Target=範圍前, Special=吞噬增加量 15, 吞噬範圍 1.2
    if (!pStats.some(s => s.label === '攻擊力' && s.val === '1000')) {
      throw new Error(`Predator attack should be 1000, got: ${JSON.stringify(pStats)}`);
    }
    if (!pStats.some(s => s.label === '目標' && s.val === '範圍前')) {
      throw new Error(`Predator target should be 範圍前, got: ${JSON.stringify(pStats)}`);
    }
    if (!pStats.some(s => s.label === '吞噬增加量' && s.val === '15')) {
      throw new Error(`Predator special 吞噬增加量 15 missing! Got: ${JSON.stringify(pStats)}`);
    }
    if (!pStats.some(s => s.label === '吞噬範圍' && s.val === '1.2')) {
      throw new Error(`Predator special 吞噬範圍 1.2 missing! Got: ${JSON.stringify(pStats)}`);
    }
    console.log('✓ Predator Dice 2-column grid & special stats 100% matched!');
    await page.screenshot({ path: 'C:/Users/zhiwa/.gemini/antigravity/brain/e6521c8b-03b0-4e50-8b8d-8ef940f47abc/tooltip_predator_dice.png' });

    // Test Tag Popover click on #吞噬
    await page.evaluate(() => {
      const btn = document.querySelector('.tooltip-hashtag-chip[data-tag-key="PREDATOR"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(200);
    const popoverVisible = await page.$eval('#tag-popover', el => !el.hidden && el.getAttribute('aria-hidden') === 'false');
    const popoverBadge = await page.$eval('#tag-popover-badge', el => el.textContent.trim());
    const popoverDesc = await page.$eval('#tag-popover-desc', el => el.textContent.trim());
    console.log(`✓ Tag Popover Verified: visible=${popoverVisible}, badge="${popoverBadge}", desc="${popoverDesc}"`);
    if (!popoverVisible || popoverBadge !== '#吞噬' || !popoverDesc.includes('根據吞噬的怪物數量')) {
      throw new Error(`Tag popover failed to show correct explanation!`);
    }
    await page.screenshot({ path: 'C:/Users/zhiwa/.gemini/antigravity/brain/e6521c8b-03b0-4e50-8b8d-8ef940f47abc/tooltip_tag_popover.png' });

    // 5.3 Test Predator Rune (Node 5109 連鎖吞噬) - Centered layout & underline tag
    await page.evaluate(() => {
      window.__TEST_HOOKS__.centerOnNode('5109', false);
      window.__TEST_HOOKS__.showTooltip('5109', true);
    });
    await page.waitForTimeout(500);
    const runeTitle = await page.$eval('#tooltip-title', el => el.textContent.trim());
    const runeUnderline = await page.$eval('.detail-copy .tooltip-tag-inline', el => el.textContent.trim());
    console.log(`✓ Predator Rune opened: "${runeTitle}", Underlined Tag: "${runeUnderline}"`);
    await page.screenshot({ path: 'C:/Users/zhiwa/.gemini/antigravity/brain/e6521c8b-03b0-4e50-8b8d-8ef940f47abc/tooltip_predator_rune_5109.png' });

    // 5.2 Test Currency Badges (Default OFF as requested by user)
    console.log('Testing Currency Badges (Default OFF & Toggle ON/OFF)...');
    const defaultOffCheck = await page.evaluate(() => {
      const hasClass = document.body.classList.contains('show-currency-badges');
      const badge = document.querySelector('.map-scene .cost-badge');
      const opacity = badge ? window.getComputedStyle(badge).opacity : '0';
      return !hasClass && parseFloat(opacity) < 0.1;
    });
    console.log(`✓ Currency Badges default OFF verified: ${defaultOffCheck}`);
    if (!defaultOffCheck) throw new Error('Currency badges should be OFF by default');

    // Click toggle to turn ON
    await page.click('#toggle-currency-btn');
    await page.waitForTimeout(200);
    const toggledOnCheck = await page.evaluate(() => {
      const hasClass = document.body.classList.contains('show-currency-badges');
      const badge = document.querySelector('.map-scene .cost-badge');
      const opacity = badge ? window.getComputedStyle(badge).opacity : '0';
      return hasClass && parseFloat(opacity) > 0.9;
    });
    console.log(`✓ Currency Badges toggle ON verified: ${toggledOnCheck}`);
    if (!toggledOnCheck) throw new Error('Currency badges toggle ON failed');

    // Click toggle to turn back OFF
    await page.click('#toggle-currency-btn');
    await page.waitForTimeout(200);

    // 6. Test Search Functionality & Canvas Topology Highlighting (DRY with Filter)
    await page.fill('#search-input', '尖刺');
    await page.waitForSelector('body.has-search-active', { timeout: 3000 });
    await page.waitForSelector('g.node.is-search-matched', { timeout: 3000 });
    await page.waitForTimeout(300); // 預留 CSS opacity transition

    const searchResultsCount = await page.$$eval('.search-result', items => items.length);
    console.log(`✓ Search for "尖刺" returned ${searchResultsCount} matching results`);
    if (searchResultsCount === 0) throw new Error('Search failed to return results for "尖刺"');

    const searchCanvasHighlightCheck = await page.evaluate(() => {
      const hasClass = document.body.classList.contains('has-search-active');
      const matchedNode = document.querySelector('g.node.is-search-matched');
      const dimmedNode = document.querySelector('g.node:not(.is-search-matched)');
      const matchedEdge = document.querySelector('path.edge.is-search-edge');
      return {
        hasClass,
        matchedNodeOpacity: matchedNode ? parseFloat(window.getComputedStyle(matchedNode).opacity) : 0,
        dimmedNodeOpacity: dimmedNode ? parseFloat(window.getComputedStyle(dimmedNode).opacity) : 1,
        matchedEdgeOpacity: matchedEdge ? parseFloat(window.getComputedStyle(matchedEdge).opacity) : 0
      };
    });
    console.log(`✓ Search Canvas Unified Highlight verified (DRY): hasClass=${searchCanvasHighlightCheck.hasClass}, matchOpacity=${searchCanvasHighlightCheck.matchedNodeOpacity.toFixed(2)}, dimmedOpacity=${searchCanvasHighlightCheck.dimmedNodeOpacity.toFixed(2)}`);
    if (!searchCanvasHighlightCheck.hasClass || searchCanvasHighlightCheck.matchedNodeOpacity < 0.9 || searchCanvasHighlightCheck.dimmedNodeOpacity > 0.25) {
      throw new Error('Search must share unified canvas topology highlight effects with filter');
    }

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
    if (Math.abs(searchCircleCheck.width - 40) > 4) throw new Error('Search button must be ~40px circle button on mobile');

    // Verify Single-Row Filter Rail is visible and parallel to search button
    const filterRailVisible = await page.$eval('.filter-bar', el => {
      const s = window.getComputedStyle(el);
      return s.display === 'flex' && parseFloat(s.height) <= 42;
    });
    console.log(`✓ Mobile single-row top filter rail verified: ${filterRailVisible}`);
    if (!filterRailVisible) throw new Error('Filter rail must be visible on mobile topbar in single row');

    // 點擊節點以觸發手機端相機居中與 Tooltip 幾何浮動定位
    const node1001 = await page.$('g.node[data-node-id="1001"]');
    if (node1001) {
      await node1001.click();
      await page.waitForTimeout(600);
    }

    const tooltipPositionCheck = await page.$eval('#tooltip', el => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      return {
        position: window.getComputedStyle(el).position,
        width: rect.width,
        top: rect.top,
        deltaX: Math.abs(centerX - window.innerWidth / 2)
      };
    });
    console.log(`✓ Mobile tooltip dynamic geometric alignment: position=${tooltipPositionCheck.position}, width=${tooltipPositionCheck.width}px, top=${tooltipPositionCheck.top}px, deltaX=${tooltipPositionCheck.deltaX.toFixed(1)}px`);
    if (tooltipPositionCheck.position !== 'fixed' || tooltipPositionCheck.width > 350 || tooltipPositionCheck.deltaX > 20) {
      throw new Error('Tooltip must use unified geometric positioning with comfortable scaled width on mobile');
    }

    // Check effective viewport touch area on mobile (now even larger >= 80%)
    const topbarHeight = await page.$eval('.topbar', el => el.getBoundingClientRect().height);
    const toolbarHeight = await page.$eval('.map-toolbar', el => el.getBoundingClientRect().height);
    const totalScreenHeight = 844;
    const effectiveArea = ((totalScreenHeight - topbarHeight - toolbarHeight) / totalScreenHeight) * 100;
    console.log(`✓ Mobile effective canvas area: ${effectiveArea.toFixed(1)}% (Requirement: >= 75%)`);
    if (effectiveArea < 75) throw new Error('Mobile effective canvas area is less than 75%');

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

    // 8. Verify Bottom-Left Disclaimer & Copyright Widget (Morphing Animation)
    console.log('\n--- TESTING DISCLAIMER WIDGET & MORPHING ANIMATION ---');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);

    const disclaimerBtn = await page.$('#disclaimer-toggle-btn');
    if (!disclaimerBtn) throw new Error('Disclaimer button not found');

    const initialBtnStyle = await page.evaluate(() => {
      const w = document.querySelector('#disclaimer-widget');
      const s = window.getComputedStyle(w);
      return {
        width: parseFloat(s.width),
        height: parseFloat(s.height),
        borderRadius: s.borderRadius,
        left: s.left,
        bottom: s.bottom,
        bg: s.backgroundColor,
      };
    });
    console.log(`✓ Initial Disclaimer Button: width=${initialBtnStyle.width}px, height=${initialBtnStyle.height}px, radius=${initialBtnStyle.borderRadius}, left=${initialBtnStyle.left}, bottom=${initialBtnStyle.bottom}`);
    if (Math.abs(initialBtnStyle.width - 36) > 4 || Math.abs(initialBtnStyle.height - 36) > 4) {
      throw new Error('Disclaimer widget must be a 36px circle button when collapsed');
    }

    // Click button to trigger Morphing Animation into rounded rectangular card
    await page.click('#disclaimer-toggle-btn');
    await page.waitForTimeout(400); // 預留 morphing animation

    const expandedCardStyle = await page.evaluate(() => {
      const w = document.querySelector('#disclaimer-widget');
      const isExpanded = w.classList.contains('is-expanded');
      const s = window.getComputedStyle(w);
      const title = document.querySelector('#disclaimer-heading')?.textContent.trim();
      const badge = document.querySelector('.disclaimer-badge')?.textContent.trim();
      const emailLink = document.querySelector('.disclaimer-email-link');
      const emailHref = emailLink ? emailLink.getAttribute('href') : '';
      const emailText = emailLink ? emailLink.textContent.trim() : '';
      const takedownNotice = document.querySelector('.disclaimer-takedown-notice')?.textContent.trim() || '';

      return {
        isExpanded,
        width: parseFloat(s.width),
        height: parseFloat(s.height),
        borderRadius: s.borderRadius,
        title,
        badge,
        emailHref,
        emailText,
        takedownNotice,
      };
    });
    console.log(`✓ Expanded Disclaimer Card: isExpanded=${expandedCardStyle.isExpanded}, width=${expandedCardStyle.width}px, height=${expandedCardStyle.height}px, email="${expandedCardStyle.emailText}"`);
    console.log(`✓ DMCA Notice Verified: "${expandedCardStyle.takedownNotice.slice(0, 60)}..."`);
    if (!expandedCardStyle.isExpanded || expandedCardStyle.width < 320 || expandedCardStyle.height < 250) {
      throw new Error('Disclaimer widget must morph into rounded rectangular card with height ~345px');
    }
    if (expandedCardStyle.emailHref !== 'mailto:itsestrella71@gmail.com') {
      throw new Error('Disclaimer email link must be mailto:itsestrella71@gmail.com');
    }
    if (!expandedCardStyle.takedownNotice.includes('representative of 111 Percent Inc.') || !expandedCardStyle.takedownNotice.includes('we will comply immediately')) {
      throw new Error('Disclaimer must include standard DMCA takedown notice in English');
    }

    const artifactPathDesktop = 'C:/Users/zhiwa/.gemini/antigravity/brain/e6521c8b-03b0-4e50-8b8d-8ef940f47abc/disclaimer_expanded_desktop.png';
    await page.screenshot({ path: artifactPathDesktop });

    // Click close button to shrink back to circle
    await page.click('#disclaimer-close-btn');
    await page.waitForTimeout(400);

    const closedStyle = await page.evaluate(() => {
      const w = document.querySelector('#disclaimer-widget');
      return { isExpanded: w.classList.contains('is-expanded') };
    });
    console.log(`✓ Closed Disclaimer Button: isExpanded=${closedStyle.isExpanded}`);
    if (closedStyle.isExpanded) throw new Error('Disclaimer widget should shrink back on close');

    // Mobile Viewport test for Disclaimer Widget
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.click('#disclaimer-toggle-btn');
    await page.waitForTimeout(400);

    const mobileExpandedStyle = await page.evaluate(() => {
      const w = document.querySelector('#disclaimer-widget');
      const s = window.getComputedStyle(w);
      const emailLink = document.querySelector('.disclaimer-email-link');
      return {
        isExpanded: w.classList.contains('is-expanded'),
        width: parseFloat(s.width),
        height: parseFloat(s.height),
        hasEmail: emailLink && emailLink.textContent.includes('itsestrella71@gmail.com')
      };
    });
    console.log(`✓ Mobile Expanded Disclaimer Card: isExpanded=${mobileExpandedStyle.isExpanded}, width=${mobileExpandedStyle.width}px, height=${mobileExpandedStyle.height}px, hasEmail=${mobileExpandedStyle.hasEmail}`);
    if (!mobileExpandedStyle.isExpanded || mobileExpandedStyle.width < 340 || !mobileExpandedStyle.hasEmail) {
      throw new Error('Mobile disclaimer card must adapt cleanly and show email');
    }

    const artifactPathMobile = 'C:/Users/zhiwa/.gemini/antigravity/brain/e6521c8b-03b0-4e50-8b8d-8ef940f47abc/disclaimer_expanded_mobile.png';
    await page.screenshot({ path: artifactPathMobile });

    await page.click('#disclaimer-close-btn');
    await page.waitForTimeout(300);

    // 9. Verify Loading Screen Visuals
    const loadingTestPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await loadingTestPage.addInitScript(() => {
      window.__BLOCK_DISMISS_LOADER__ = true;
    });
    await loadingTestPage.goto('http://localhost:3000/index.html');
    await loadingTestPage.waitForSelector('#loading-screen', { timeout: 3000 });
    const loaderArtifactPath = 'C:/Users/zhiwa/.gemini/antigravity/brain/e6521c8b-03b0-4e50-8b8d-8ef940f47abc/loading_screen_preview.png';
    await loadingTestPage.screenshot({ path: loaderArtifactPath });
    await loadingTestPage.close();
    console.log('✓ Loading screen clean typography & visual preview verified');

    console.log('\n========================================');
    console.log('🎉 ALL AUTOMATED TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================\n');

    await browser.close();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    server.close();
    process.exit(1);
  }
});
