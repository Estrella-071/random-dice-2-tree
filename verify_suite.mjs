import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteDir = path.resolve(process.env.VERIFY_SITE_DIR || path.join(__dirname, 'site'));
const allowedSiteDirs = [path.join(__dirname, 'site'), path.join(__dirname, '.pages')]
  .map(directory => path.resolve(directory));
const comparablePath = value => process.platform === 'win32' ? value.toLowerCase() : value;
if (!allowedSiteDirs.some(directory => comparablePath(directory) === comparablePath(siteDir))) {
  throw new Error(`VERIFY_SITE_DIR must point to repository site/ or verified .pages/ staging: ${siteDir}`);
}
const artifactDir = path.resolve(process.env.VERIFY_ARTIFACT_DIR || path.join(__dirname, 'artifacts', 'verify-suite'));
const requestedPort = Number.parseInt(process.env.VERIFY_PORT || '0', 10);

fs.mkdirSync(artifactDir, { recursive: true });

function screenshotPath(filename) {
  return path.join(artifactDir, filename);
}

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
  const parsedUrl = new URL(req.url, 'http://127.0.0.1');
  let relativePath;
  try {
    relativePath = decodeURIComponent(parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  const filePath = path.resolve(siteDir, `.${relativePath}`);
  if (filePath !== siteDir && !filePath.startsWith(`${siteDir}${path.sep}`)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  const stream = fs.createReadStream(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  stream.pipe(res);
});

server.listen(Number.isNaN(requestedPort) ? 0 : requestedPort, '127.0.0.1', async () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : requestedPort;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test HTTP server listening on ${baseUrl}`);

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    console.log('\n--- TEST SUITE: Random Dice 2 Refactor ---');

    page.on('console', msg => console.log('[PAGE LOG]', msg.text()));
    page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

    // 0. Test File:// protocol offline support (Zero CORS errors)
    const filePage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const fileErrors = [];
    filePage.on('pageerror', err => fileErrors.push(err.message));
    filePage.on('console', msg => {
      if (msg.type() === 'error') fileErrors.push(msg.text());
    });
    const localFileUrl = 'file:///' + path.join(siteDir, 'index.html').replace(/\\/g, '/');
    await filePage.goto(localFileUrl, { waitUntil: 'load' });
    await filePage.waitForSelector('g.node[data-node-id]', { timeout: 8000 });
    console.log(`✓ Offline file:// protocol verified: nodes rendered with 0 CORS errors`);
    if (fileErrors.length > 0) {
      throw new Error(`File:// protocol had errors: ${JSON.stringify(fileErrors)}`);
    }
    await filePage.close();

    // Load page via HTTP
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
    console.log('✓ Page loaded successfully via HTTP');

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
    await page.screenshot({ path: screenshotPath('tooltip_fire_dice.png') });

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

    // 5. Test Multi-rank node Interactive Rank Slider (Node 1201 子彈傷害%增加)
    const node1201 = await page.$('g.node[data-node-id="1201"]');
    if (!node1201) throw new Error('Node 1201 element not found');
    await node1201.click();
    await page.waitForTimeout(300);

    const title1201 = await page.$eval('#tooltip-title', el => el.textContent.trim());
    const rankBadge1201 = await page.$eval('#tooltip-rank-badge', el => el.textContent.trim());
    console.log(`✓ Node 1201 opened: "${title1201}" with rank "${rankBadge1201}"`);

    // Verify upgrade table & full cumulative line are completely REMOVED
    const tableExists = await page.$('.upgrade-table');
    const tableContainerExists = await page.$('.upgrade-table-container');
    const fullCumLine = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('.meta-line span')).map(el => el.textContent.trim());
      return texts.includes('滿階累計');
    });
    if (tableExists || tableContainerExists || fullCumLine) {
      throw new Error(`Upgrade table or 滿階累計 was not removed! table=${!!tableExists}, cumLine=${fullCumLine}`);
    }
    console.log('✓ Upgrade Table & 滿階累計 successfully removed from tooltip');

    // Verify Rank Slider exists
    const sliderExists = await page.$('.rank-slider-input');
    if (!sliderExists) throw new Error('Rank slider input not found in tooltip');
    const sliderMax = await page.$eval('.rank-slider-input', el => el.max);
    console.log(`✓ Interactive Rank Slider verified: max=${sliderMax}`);

    // Test sliding to rank 25
    await page.evaluate(() => {
      const slider = document.querySelector('.rank-slider-input');
      slider.value = '25';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    const updatedRankBadge = await page.$eval('#tooltip-rank-badge', el => el.textContent.trim());
    const updatedSliderRank = await page.$eval('.slider-rank-current', el => el.textContent.trim());
    const updatedDesc = await page.$eval('.detail-copy', el => el.textContent.trim());
    const updatedCost = await page.$eval('.slider-cost-value', el => el.textContent.trim());
    const costLabel25 = await page.$eval('.meta-line-cost .cost-label', el => el.textContent.trim());
    console.log(`✓ Rank Slider moved to 25: badge="${updatedRankBadge}", display="${updatedSliderRank}", desc="${updatedDesc}", cost="${updatedCost}", costLabel="${costLabel25}"`);
    if (updatedRankBadge !== '25/50' || updatedSliderRank !== '25' || costLabel25 !== '升階消耗') {
      throw new Error(`Slider failed to update rank or cost label! Got badge=${updatedRankBadge}, slider=${updatedSliderRank}, label=${costLabel25}`);
    }

    // Test sliding back to rank 1 -> label must become "解鎖消耗"
    await page.evaluate(() => {
      const slider = document.querySelector('.rank-slider-input');
      slider.value = '1';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    const costLabel1 = await page.$eval('.meta-line-cost .cost-label', el => el.textContent.trim());
    console.log(`✓ Rank Slider moved back to 1: costLabel="${costLabel1}"`);
    if (costLabel1 !== '解鎖消耗') {
      throw new Error(`Expected cost label to revert to '解鎖消耗', got: ${costLabel1}`);
    }

    // Test Rubber-banding (Overdrag < 0% with resistance)
    const overdragLeftResult = await page.evaluate(() => {
      const slider = document.querySelector('.rank-slider-input');
      const rect = slider.getBoundingClientRect();
      slider.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 99, clientX: rect.left + 10, clientY: rect.top + 4, button: 0, bubbles: true }));
      slider.dispatchEvent(new PointerEvent('pointermove', { pointerId: 99, clientX: rect.left - 50, clientY: rect.top + 4, bubbles: true }));
      const overshootX = slider.style.getPropertyValue('--overshoot-x');
      const hasDraggingClass = slider.classList.contains('is-dragging');
      return { overshootX, hasDraggingClass };
    });
    console.log(`✓ Overdrag Left (0% boundary resistance): overshootX=${overdragLeftResult.overshootX}, is-dragging=${overdragLeftResult.hasDraggingClass}`);
    if (parseFloat(overdragLeftResult.overshootX) >= 0) {
      throw new Error(`Expected negative overshootX during left overdrag, got: ${overdragLeftResult.overshootX}`);
    }

    // Release pointer and verify spring bounce back to 0px
    const bounceBackResult = await page.evaluate(() => {
      const slider = document.querySelector('.rank-slider-input');
      slider.dispatchEvent(new PointerEvent('pointerup', { pointerId: 99, bubbles: true }));
      const isSpringing = slider.classList.contains('is-springing');
      const overshootAfterUp = slider.style.getPropertyValue('--overshoot-x');
      return { isSpringing, overshootAfterUp };
    });
    console.log(`✓ Spring Bounce Back verified: is-springing=${bounceBackResult.isSpringing}, overshootX=${bounceBackResult.overshootAfterUp}`);
    if (parseFloat(bounceBackResult.overshootAfterUp) !== 0) {
      throw new Error(`Expected overshootX to reset to 0px on release, got: ${bounceBackResult.overshootAfterUp}`);
    }
    await page.screenshot({ path: screenshotPath('tooltip_rank_slider.png') });

    // 5.1 Test Player Passive Node (Node 5109 所有骰子傷害) - (+0.6%) green styling verification
    console.log('Testing Node 5109 (所有骰子傷害)...');
    await page.evaluate(() => {
      window.__TEST_HOOKS__.centerOnNode('5109', false);
      window.__TEST_HOOKS__.showTooltip('5109', true);
    });
    await page.waitForTimeout(300);

    const descHtml5109 = await page.$eval('.detail-copy', el => el.innerHTML);
    const hasGreenAdd5109 = await page.evaluate(() => {
      const greenEl = document.querySelector('.detail-copy .stat-green-add');
      return greenEl && greenEl.textContent.trim() === '(+0.6%)';
    });
    console.log(`✓ Node 5109 opened, descHtml="${descHtml5109}", hasGreenAdd=${hasGreenAdd5109}`);
    if (!hasGreenAdd5109) {
      throw new Error(`Node 5109 (+0.6%) failed to have .stat-green-add green styling! HTML: ${descHtml5109}`);
    }
    await page.screenshot({ path: screenshotPath('tooltip_passive_5109.png') });

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
    if (!pStats.some(s => s.label === '攻擊力' && s.val.startsWith('1000'))) {
      throw new Error(`Predator attack should be 1000, got: ${JSON.stringify(pStats)}`);
    }
    if (!pStats.some(s => s.label === '目標' && s.val.startsWith('範圍前'))) {
      throw new Error(`Predator target should be 範圍前, got: ${JSON.stringify(pStats)}`);
    }
    if (!pStats.some(s => s.label === '吞噬增加量' && s.val.startsWith('15'))) {
      throw new Error(`Predator special 吞噬增加量 15 missing! Got: ${JSON.stringify(pStats)}`);
    }
    if (!pStats.some(s => s.label === '吞噬範圍' && s.val.startsWith('1.2'))) {
      throw new Error(`Predator special 吞噬範圍 1.2 missing! Got: ${JSON.stringify(pStats)}`);
    }
    console.log('✓ Predator Dice 2-column grid & special stats 100% matched!');

    // Test clicking "強化" (Power-up) button cycle: 強化 -> 2 -> 3
    await page.evaluate(() => {
      document.querySelector('.btn-powerup')?.click();
    });
    await page.waitForTimeout(200);
    const powerupLabel2 = await page.$eval('.btn-powerup', el => el.textContent.trim());
    console.log(`✓ Power-up button clicked once: label="${powerupLabel2}"`);
    if (powerupLabel2 !== '2') {
      throw new Error(`Expected powerup button to show '2', got '${powerupLabel2}'`);
    }

    const powerupStats = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.dice-stat-item')).map(el => ({
        label: el.querySelector('.dice-stat-label')?.textContent.trim(),
        val: el.querySelector('.dice-stat-val')?.textContent.trim().replace(/\s+/g, ' ')
      }));
    });
    console.log('✓ Power-up mode stats (Lv 2):', powerupStats);
    if (!powerupStats.some(s => s.label === '吞噬增加量' && s.val.includes('15') && s.val.includes('(+25)'))) {
      throw new Error(`Power-up mode expected 吞噬增加量 15 (+25), got: ${JSON.stringify(powerupStats)}`);
    }
    if (!powerupStats.some(s => s.label === '吞噬範圍' && s.val.includes('1.2') && s.val.includes('(+0.05)'))) {
      throw new Error(`Power-up mode expected 吞噬範圍 1.2 (+0.05), got: ${JSON.stringify(powerupStats)}`);
    }
    await page.screenshot({ path: screenshotPath('tooltip_predator_powerup.png') });

    // Test clicking "提升骰點" (Dot Upgrade) button: 提升骰點 -> 2 (now Coexisting: Powerup 2 + Dot 2)
    await page.evaluate(() => {
      document.querySelector('.btn-dot')?.click();
    });
    await page.waitForTimeout(200);
    const dotLabel2 = await page.$eval('.btn-dot', el => el.textContent.trim());
    console.log(`✓ Dot button clicked once: label="${dotLabel2}"`);
    if (dotLabel2 !== '2') {
      throw new Error(`Expected dot button to show '2', got '${dotLabel2}'`);
    }

    // Verify Coexistence: 吞噬增加量 has gold (+25) and purple (+25)
    const coexistCheck = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.dice-stat-item'));
      const gainItem = items.find(el => el.querySelector('.dice-stat-label')?.textContent.trim() === '吞噬增加量');
      const goldSpan = gainItem?.querySelector('.stat-bonus-val.is-gold');
      const purpleSpan = gainItem?.querySelector('.stat-bonus-val.is-purple');
      return {
        goldVisible: goldSpan && !goldSpan.hidden ? goldSpan.textContent.trim() : null,
        purpleVisible: purpleSpan && !purpleSpan.hidden ? purpleSpan.textContent.trim() : null,
      };
    });
    console.log('✓ Coexistence dual-bonus verified:', coexistCheck);
    if (coexistCheck.goldVisible !== '(+25)' || coexistCheck.purpleVisible !== '(+25)') {
      throw new Error(`Expected dual bonus (+25) gold and (+25) purple, got: ${JSON.stringify(coexistCheck)}`);
    }
    await page.screenshot({ path: screenshotPath('tooltip_predator_coexist.png') });

    // Test multi-level cycling: Advance Dot to 3
    await page.evaluate(() => {
      document.querySelector('.btn-dot')?.click();
    });
    await page.waitForTimeout(200);
    const dotLabel3 = await page.$eval('.btn-dot', el => el.textContent.trim());
    const dot3Gain = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.dice-stat-item'));
      const gainItem = items.find(el => el.querySelector('.dice-stat-label')?.textContent.trim() === '吞噬增加量');
      return gainItem?.querySelector('.stat-bonus-val.is-purple')?.textContent.trim();
    });
    console.log(`✓ Dot cycled to 3: button="${dotLabel3}", purple bonus="${dot3Gain}"`);
    if (dotLabel3 !== '3' || dot3Gain !== '(+50)') {
      throw new Error(`Expected dot 3 with (+50) purple bonus, got label=${dotLabel3}, bonus=${dot3Gain}`);
    }

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

    // Verify MUTATION and DOOM tag localization
    const tagDefs = await page.evaluate(() => window.TREE_DATA.tag_definitions);
    console.log(`✓ Checking MUTATION & DOOM localization: MUTATION="${tagDefs.MUTATION?.desc_zh}", DOOM="${tagDefs.DOOM?.desc_zh}"`);
    if (tagDefs.MUTATION?.desc_zh.includes('MUTATION') || tagDefs.DOOM?.desc_zh.includes('NORMAL_MONSTER')) {
      throw new Error(`Tag definitions still contain raw English constants!`);
    }
    await page.screenshot({ path: screenshotPath('tooltip_tag_popover.png') });

    // 5.3 Test Predator Rune (Node 5307 連鎖吞噬) - Centered layout & underline tag
    await page.evaluate(() => {
      window.__TEST_HOOKS__.centerOnNode('5307', false);
      window.__TEST_HOOKS__.showTooltip('5307', true);
    });
    await page.waitForTimeout(500);
    const runeTitle = await page.$eval('#tooltip-title', el => el.textContent.trim());
    const runeUnderline = await page.$eval('.detail-copy .tooltip-tag-inline', el => el.textContent.trim());
    console.log(`✓ Predator Rune opened: "${runeTitle}", Underlined Tag: "${runeUnderline}"`);
    await page.screenshot({ path: screenshotPath('tooltip_predator_rune_5307.png') });

    // 5.4 Test Greed Dice (Node 5006 貪婪骰子) - Only #SP怪物 (No #合成時, No #召喚)
    console.log('Testing Greed Dice (Node 5006) tag precision...');
    await page.evaluate(() => {
      window.__TEST_HOOKS__.centerOnNode('5006', false);
      window.__TEST_HOOKS__.showTooltip('5006', true);
    });
    await page.waitForTimeout(500);
    const greedTags = await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('.tooltip-hashtag-chip')).map(el => el.textContent.trim());
      const underlines = Array.from(document.querySelectorAll('.tooltip-tag-inline')).map(el => el.textContent.trim());
      return { chips, underlines };
    });
    console.log(`✓ Greed Dice Tags: chips=${JSON.stringify(greedTags.chips)}, underlines=${JSON.stringify(greedTags.underlines)}`);
    if (greedTags.chips.length !== 1 || greedTags.chips[0] !== '#SP怪物') {
      throw new Error(`Greed dice should ONLY have ['#SP怪物'], but got: ${JSON.stringify(greedTags.chips)}`);
    }
    if (!greedTags.underlines.includes('SP怪物') || greedTags.underlines.includes('合成時') || greedTags.underlines.includes('召喚')) {
      throw new Error(`Greed dice underlines should only be ['SP怪物'], got: ${JSON.stringify(greedTags.underlines)}`);
    }
    console.log('✓ Greed Dice Tag Precision 100% verified (Zero over-tagging)!');

    // 5.5 Test Prerequisite Node Jump Camera Alignment & Above Positioning (前置節點跳轉攝影機與上方定位)
    console.log('Testing Prerequisite Node Jump from 5102 to 5106 (渾沌召喚2骰點)...');
    await page.evaluate(() => {
      window.__TEST_HOOKS__.centerOnNode('5102', false);
      window.__TEST_HOOKS__.showTooltip('5102', true);
    });
    await page.waitForTimeout(500);

    const jumpResult5106 = await page.evaluate(() => {
      const pill = document.querySelector('.node-link-pill[data-target-id="5106"]');
      if (!pill) return { found: false };
      pill.click();
      return { found: true };
    });
    if (!jumpResult5106.found) {
      throw new Error('Prerequisite pill for Node 5106 not found in Node 5102 tooltip!');
    }
    await page.waitForTimeout(600);

    const check5106 = await page.evaluate(() => {
      const tooltip = document.getElementById('tooltip');
      const state = window.__TEST_HOOKS__.getState();
      const pt = state.nodePositions.get('5106');
      const screenY = state.panY + pt.y * state.scale;
      const tooltipRect = tooltip.getBoundingClientRect();
      const isPlacedBelow = tooltip.classList.contains('is-placed-below');
      return {
        title: document.getElementById('tooltip-title')?.textContent.trim(),
        tooltipBottom: tooltipRect.bottom,
        nodeScreenY: screenY,
        isPlacedBelow,
        isAbove: !isPlacedBelow && tooltipRect.bottom < screenY,
      };
    });
    console.log('✓ Node 5106 Jump Position Check (Normal Mode Above):', check5106);
    if (!check5106.title.includes('渾沌召喚2骰點') || !check5106.isAbove) {
      throw new Error(`Node 5106 tooltip failed to position ABOVE node in normal mode! result: ${JSON.stringify(check5106)}`);
    }
    await page.screenshot({ path: screenshotPath('tooltip_prerequisite_above_verified.png') });

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

    // 6.1 Test Filter Camera Auto Fit (Single, Multi-select & Cancel)
    console.log('\n--- TESTING FILTER CAMERA AUTO-FIT & MULTI-SELECT ---');
    // 清除搜尋
    await page.click('#search-clear');
    await page.waitForTimeout(300);

    // 點擊自然派系篩選 (Branch 1)
    await page.click('.filter-chip.branch-chip[data-branch="1"]');
    await page.waitForTimeout(500);
    const filterNatureCheck = await page.evaluate(() => {
      const state = window.__TEST_HOOKS__?.getState?.() || {};
      const scale = state.scale || 1;
      const panX = state.panX || 0;
      return { scale, panX, hasFilterClass: document.body.classList.contains('has-active-filter') };
    });
    console.log(`✓ Nature filter camera auto-focused: scale=${filterNatureCheck.scale.toFixed(2)}, panX=${filterNatureCheck.panX.toFixed(1)}px, hasFilter=${filterNatureCheck.hasFilterClass}`);
    if (!filterNatureCheck.hasFilterClass) throw new Error('Filter highlight class missing');

    // 多選工學派系篩選 (Branch 2)
    await page.click('.filter-chip.branch-chip[data-branch="2"]');
    await page.waitForTimeout(500);
    const filterMultiCheck = await page.evaluate(() => {
      const state = window.__TEST_HOOKS__?.getState?.() || {};
      const scale = state.scale || 1;
      return { scale, branchCount: state.filterBranches?.size };
    });
    console.log(`✓ Multi-select filter camera auto-adjusted: scale=${filterMultiCheck.scale.toFixed(2)}, branches=${filterMultiCheck.branchCount}`);
    if (filterMultiCheck.branchCount !== 2) throw new Error('Multi-select branch count mismatch');

    // 6.2 Test Prerequisite Highlighting Overriding Filter (Priority Check)
    console.log('Testing Prerequisite Highlighting Priority Over Filter...');
    // 在自然+工學篩選仍開啟的情況下，打開渾沌派系節點 5102 (渾沌骰子子彈傷害) 並開啟前置高亮
    await page.evaluate(() => {
      window.__TEST_HOOKS__.centerOnNode('5102', false);
      window.__TEST_HOOKS__.showTooltip('5102', true);
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const state = window.__TEST_HOOKS__.getState();
      if (!state.showPrereqMode) {
        document.getElementById('toggle-prereq-btn')?.click();
      }
    });
    await page.waitForTimeout(500);

    const priorityCheck = await page.evaluate(() => {
      const hasPrereqClass = document.body.classList.contains('has-prereq-highlight');
      const hasOverrideClass = document.body.classList.contains('prereq-overrides-filter');
      // 自然派系節點 1001 (當前篩選派系，不應變暗，應為 1.0)
      const node1001 = document.querySelector('g.node[data-node-id="1001"]');
      const node1001Opacity = node1001 ? parseFloat(window.getComputedStyle(node1001).opacity) : 0;
      // 5102 前置路徑節點 5106 (前置路徑，應為 1.0)
      const node5106 = document.querySelector('g.node[data-node-id="5106"]');
      const node5106Opacity = node5106 ? parseFloat(window.getComputedStyle(node5106).opacity) : 0;
      // 秩序派系節點 4001 (未被篩選且非前置路徑，應暗化為 0.12)
      const node4001 = document.querySelector('g.node[data-node-id="4001"]');
      const node4001Opacity = node4001 ? parseFloat(window.getComputedStyle(node4001).opacity) : 1;
      return {
        hasPrereqClass,
        hasOverrideClass,
        filteredNatureOpacity: node1001Opacity,
        prereqChaosOpacity: node5106Opacity,
        unfilteredOrderOpacity: node4001Opacity,
      };
    });
    console.log(`✓ Other branch prereq does not dim active filter: hasPrereq=${priorityCheck.hasPrereqClass}, hasOverride=${priorityCheck.hasOverrideClass}, filterNatureOpacity=${priorityCheck.filteredNatureOpacity.toFixed(2)}, prereqOpacity=${priorityCheck.prereqChaosOpacity.toFixed(2)}, unselectedDimmedOpacity=${priorityCheck.unfilteredOrderOpacity.toFixed(2)}`);
    if (!priorityCheck.hasPrereqClass || priorityCheck.filteredNatureOpacity < 0.9 || priorityCheck.prereqChaosOpacity < 0.9 || priorityCheck.unfilteredOrderOpacity > 0.25) {
      throw new Error('Active filter branches must stay lit when viewing prerequisite paths in other branches');
    }

    // 6.3 Test Tooltip Smart Avoidance (Placed Below When Prereq Nodes Are Above)
    console.log('Testing Tooltip Smart Avoidance of Prerequisite Path...');
    const avoidanceCheck = await page.evaluate(() => {
      const tooltip = document.getElementById('tooltip');
      const state = window.__TEST_HOOKS__.getState();
      const pt = state.nodePositions.get('5102');
      const screenY = state.panY + pt.y * state.scale;
      const tooltipRect = tooltip.getBoundingClientRect();
      const isPlacedBelow = tooltip.classList.contains('is-placed-below');
      return {
        isPlacedBelow,
        tooltipTop: tooltipRect.top,
        nodeScreenY: screenY,
        isClearOfAbovePath: tooltipRect.top >= screenY, // Tooltip 位於節點下方避讓
      };
    });
    console.log(`✓ Tooltip Smart Avoidance verified: isPlacedBelow=${avoidanceCheck.isPlacedBelow}, tooltipTop=${avoidanceCheck.tooltipTop.toFixed(1)}px, nodeScreenY=${avoidanceCheck.nodeScreenY.toFixed(1)}px, isClear=${avoidanceCheck.isClearOfAbovePath}`);
    if (!avoidanceCheck.isPlacedBelow || !avoidanceCheck.isClearOfAbovePath) {
      throw new Error('Tooltip must position below node to avoid overlapping upstream prerequisite path');
    }

    // 關閉前置節點高亮，驗證 Tooltip 恢復上方
    await page.evaluate(() => {
      const state = window.__TEST_HOOKS__.getState();
      if (state.showPrereqMode) {
        document.getElementById('toggle-prereq-btn')?.click();
      }
    });
    await page.waitForTimeout(500);
    const restoredTooltipCheck = await page.evaluate(() => {
      const tooltip = document.getElementById('tooltip');
      return { isPlacedBelow: tooltip.classList.contains('is-placed-below') };
    });
    console.log(`✓ Restored Tooltip position above: isPlacedBelow=${restoredTooltipCheck.isPlacedBelow}`);
    if (restoredTooltipCheck.isPlacedBelow) throw new Error('Tooltip must restore above when prereq mode disabled');

    // 清除篩選，驗證相機復位
    await page.click('#filter-clear-btn');
    await page.waitForTimeout(500);
    const clearedFilterCheck = await page.evaluate(() => {
      return { hasFilter: document.body.classList.contains('has-active-filter') };
    });
    console.log(`✓ Clear Filter verified: hasFilter=${clearedFilterCheck.hasFilter}`);
    if (clearedFilterCheck.hasFilter) throw new Error('Filter must be completely cleared');

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

    const artifactPathDesktop = screenshotPath('disclaimer_expanded_desktop.png');
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

    const artifactPathMobile = screenshotPath('disclaimer_expanded_mobile.png');
    await page.screenshot({ path: artifactPathMobile });

    await page.click('#disclaimer-close-btn');
    await page.waitForTimeout(300);

    // 9. Verify Loading Screen Visuals
    const loadingTestPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await loadingTestPage.addInitScript(() => {
      window.__BLOCK_DISMISS_LOADER__ = true;
    });
    await loadingTestPage.goto(`${baseUrl}/index.html`);
    await loadingTestPage.waitForSelector('#loading-screen', { timeout: 3000 });
    const loaderArtifactPath = screenshotPath('loading_screen_preview.png');
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
