(() => {
  "use strict";

  const MAP_WIDTH = 4000;
  const MAP_HEIGHT = 3400;
  
  function getBaseScale() {
    return window.innerWidth <= 768 ? 0.5 : 1.0;
  }
  function getMinScale() {
    return window.innerWidth <= 768 ? 0.16 : 0.33;
  }
  function getMaxScale() {
    return window.innerWidth <= 768 ? 1.4 : 2.0;
  }
  function formatZoomPercent(scale = state.scale) {
    const base = getBaseScale();
    return `${Math.round((scale / base) * 100)}%`;
  }

  const MIN_SCALE = 0.33;
  const MAX_SCALE = 2.0;
  const DATA_URL = "data/dice_tree.json";
  const SVG_URL = "data/dice_tree.svg";

  // Perceptually Uniform OKLCH Faction System & High Contrast Tokens
  const FACTION_DATA = {
    1: { name: "自然", color: "#7ee352", surface: "rgba(126, 227, 82, 0.14)", border: "rgba(126, 227, 82, 0.35)", ink: "#071203" },
    2: { name: "工學", color: "#f5d358", surface: "rgba(245, 211, 88, 0.14)", border: "rgba(245, 211, 88, 0.35)", ink: "#140d02" },
    3: { name: "魔法", color: "#5da0ff", surface: "rgba(93, 160, 255, 0.14)", border: "rgba(93, 160, 255, 0.35)", ink: "#030c18" },
    4: { name: "秩序", color: "#baa6e0", surface: "rgba(186, 166, 224, 0.14)", border: "rgba(186, 166, 224, 0.35)", ink: "#11091a" },
    5: { name: "渾沌", color: "#cb65ff", surface: "rgba(203, 101, 255, 0.14)", border: "rgba(203, 101, 255, 0.35)", ink: "#14031a" },
  };

  // 五大派系遊戲原版選取框色彩配置（底框與對稱旋轉光芒）
  const FACTION_SELECTION_COLORS = {
    1: { name: "自然", base: "#89E464", runner: "#D7FFA4" },
    2: { name: "工學", base: "#F5DA68", runner: "#FFFFA2" },
    3: { name: "魔法", base: "#4692F1", runner: "#7CFAFD" },
    4: { name: "秩序", base: "#9F95C1", runner: "#FFFEFF" },
    5: { name: "渾沌", base: "#A93BEA", runner: "#EE6CFA" },
  };

  const NODE_TYPE_NAMES = {
    DICE: "骰子",
    DICE_RUNE: "骰子符文",
    PLAYER_PASSIVE: "全域被動",
    PERK: "輔助特性",
  };

  // 特殊解鎖方式字典（不透過骰子樹購買，文案無階、無單位）
  const SPECIAL_UNLOCK_CONDITIONS = {
    "5006": { label: "合作模式討罰獎勵 2100 獲取" },
    "5008": { label: "競技場通行證 300 獲取" },
    "4008": { label: "七日旅程 700 獲取（第二日）" },
    "5002": { label: "合作模式擊殺數達 900" },
  };

  // Comprehensive Game Tag Dictionary for Traditional Chinese
  const TAG_MAP = {
    BURN: "燙傷",
    THORN: "尖刺",
    BULLET: "子彈",
    SLOW: "減速",
    POISON: "中毒",
    CRITICAL: "暴擊",
    FROZEN: "冰凍",
    LOCK: "封印",
    DECAY: "腐敗",
    DEATH: "暴斃",
    EFFECT_DEATH: "暴斃",
    NORMAL_MONSTER: "一般怪物",
    ELITE_MONSTER: "菁英怪物",
    SPEED_MONSTER: "快速怪物",
    BIG_MONSTER: "巨大怪物",
    BOSS_MONSTER: "首領怪物",
    GOLEM_MONSTER: "SP魔像",
    BLOOM: "綻放",
    BLESS: "祝福",
    SOW: "果實",
    TRANSFER: "SP怪物",
    TAEGEUK: "陰陽",
    HARMONY: "極致和諧",
    ALIGNMENT: "排序",
    ALONE: "孤獨",
    TYRANT: "暴君化",
    PREDATOR: "吞噬",
    MUTATION: "變種",
    FAILURE: "失敗品",
    RESONANCE: "共鳴",
    DOOM: "破滅",
    BIGTHORN: "巨型尖刺",
    BUBBLE: "泡泡",
    COMBO: "連擊",
    ELEMENT: "原子",
    EXECUTIONER: "執行劍",
    LASER: "光線",
    OVERSHURIKEN: "強化魔彈",
    PILLAR: "巨石",
    POTION: "藥水",
    SAW: "鋸齒",
    SHURIKEN: "魔彈",
    STUN: "僵硬",
    MERGE: "合成時",
    SPAWN: "召喚時",
    SUMMON: "召喚",
    COPY: "複製",
    SWAP: "替換",
    GROWTH: "成長",
    CONNECT: "連接",
    STONE: "石頭",
    THUNDERHAMMER: "雷錘",
    FLOW: "流動",
    COUNTDOWN: "倒數",
    SP_GAIN: "獲得SP",
    SP_SCALE: "SP等比",
    SP_BURN: "燒毀",
    BUFF_ATKSPD: "攻擊速度增加",
    DEBUFF_ATKSPD: "攻擊速度減少",
    AREA_DAMAGE: "範圍傷害",
    CHAIN: "連鎖",
    AURA: "光環",
    CHARGE: "補充",
    ACTIVATION: "啟用條件",
  };

  const $ = (selector) => document.querySelector(selector);
  const viewport = $("#viewport");
  const scene = $("#scene");
  const emptyState = $("#empty-state");
  const searchInput = $("#search-input");
  const searchClear = $("#search-clear");
  const searchResults = $("#search-results");
  const searchStatus = $("#search-status");
  const minimap = $("#minimap");
  const minimapCanvas = $("#minimap-canvas");
  const minimapWindow = $("#minimap-window");
  const minimapPanel = $("#minimap-panel");
  const tooltip = $("#tooltip");
  const sheetHandle = $("#sheet-handle");
  const tooltipTitle = $("#tooltip-title");
  const tooltipBranchBadge = $("#tooltip-branch-badge");
  const tooltipTypeBadge = $("#tooltip-type-badge");
  const tooltipRankBadge = $("#tooltip-rank-badge");
  const tooltipDiceVisual = $("#tooltip-dice-visual");
  const tooltipDiceImg = $("#tooltip-dice-img");
  const tooltipBody = $("#tooltip-body");
  const tooltipClose = $("#tooltip-close");
  const zoomReadout = $("#zoom-readout");
  const interactionStatus = $("#interaction-status");

  const state = {
    scale: 1.0,
    panX: 0,
    panY: 0,
    targetScale: 1.0,
    targetPanX: 0,
    targetPanY: 0,
    isLerping: false,
    lastFrameTime: 0,
    vpWidth: 1440,
    vpHeight: 900,
    isNavigating: false,
    navigatingCooldownTimer: null,

    nodes: [],
    nodeById: new Map(),
    elementsById: new Map(),
    nodePositions: new Map(),

    matches: [],
    resultIndex: -1,

    filterBranches: new Set(),
    filterTypes: new Set(),

    hoveredId: null,
    selectedId: null,
    lastSelectedElement: null,
    tooltipPinned: false,

    showPrereqMode: true,
    showCurrencyBadges: false,

    // 加載期深度預算與預渲染快取 (Deep Pre-computation & Pre-baking Pipeline)
    prereqGraph: new Map(),        // nodeId -> { nodeIds: Set, branches: Set }
    tooltipDomCache: new Map(),    // nodeId -> DocumentFragment
    parsedEdges: [],               // [{ element, startId, endId }]
    searchIndex: new Map(),        // nodeId -> { name, dice, branch, type, desc, combined, tokens }
    branchNodesMap: new Map(),     // branchId (1~5) -> Set of DOM Elements
    typeNodesMap: new Map(),       // typeKey -> Set of DOM Elements
    nodeGeometryMap: new Map(),    // nodeId -> { cx, cy, isLarge, radius, branch, type }
    branchCentroids: new Map(),    // branchId -> { cx, cy }
    minimapBaseCanvas: null,       // 離屏小地圖底圖 Canvas (Offscreen Pre-baked Canvas)

    pointers: new Map(),
    drag: null,
    pinch: null,
  };

  // --- Natural Language Game Text Engine (Clean, High Contrast, No AI Slop) ---
  function formatGameText(rawText, node, currentRank = 1) {
    if (!rawText) return "";
    let text = String(rawText);

    if (node) {
      if (node.node_type === "PLAYER_PASSIVE") {
        const baseVal = parseFloat(node.passive_value ?? 0);
        const addVal = parseFloat(node.passive_rank_add ?? 0);
        const currentVal = baseVal + (currentRank - 1) * addVal;
        const currentValStr = Number.isInteger(currentVal) ? currentVal.toString() : parseFloat(currentVal.toFixed(2)).toString();

        text = text.replace(/\{0\}/g, `<strong>${currentValStr}</strong>`);
        if (node.passive_rank_add) {
          text = text.replace(/\{1\}/g, node.passive_rank_add);
        }
      } else if (node.node_type === "DICE_RUNE") {
        const base1 = parseFloat(node.rune_value1 ?? 0);
        const add1 = parseFloat(node.rune_value1_rank_add ?? 0);
        const curr1 = add1 > 0 ? (base1 + (currentRank - 1) * add1) : (node.rune_value1 ?? "");
        const curr1Str = typeof curr1 === "number" ? (Number.isInteger(curr1) ? curr1.toString() : parseFloat(curr1.toFixed(2)).toString()) : curr1;

        const base2 = parseFloat(node.rune_value2 ?? 0);
        const add2 = parseFloat(node.rune_value2_rank_add ?? 0);
        const curr2 = add2 > 0 ? (base2 + (currentRank - 1) * add2) : (node.rune_value2 ?? "");
        const curr2Str = typeof curr2 === "number" ? (Number.isInteger(curr2) ? curr2.toString() : parseFloat(curr2.toFixed(2)).toString()) : curr2;

        const dur = node.rune_duration ?? "";

        let p0 = curr1Str !== "" ? `<strong>${curr1Str}</strong>` : "";
        let p1 = node.rune_value1_rank_add || (curr2Str && !text.includes("{2}") ? `<strong>${curr2Str}</strong>` : "");
        let p2 = curr2Str !== "" ? `<strong>${curr2Str}</strong>` : "";
        let p3 = node.rune_value2_rank_add || "";
        let p4 = dur ? `<strong>${dur}</strong>` : "";
        let p5 = node.rune_duration_rank_add || "";

        text = text.replace(/\{0\}/g, p0)
                   .replace(/\{1\}/g, p1)
                   .replace(/\{2\}/g, p2)
                   .replace(/\{3\}/g, p3)
                   .replace(/\{4\}/g, p4)
                   .replace(/\{5\}/g, p5);
      } else {
        text = text.replace(/\{0\}/g, `<strong>${node.dice_attack ?? ""}</strong>`)
                   .replace(/\{1\}/g, `<strong>${node.dice_attack_interval ?? ""}</strong>`);
      }
    }

    text = text
      .replace(/<color=(?:#00ff00|#0f0|green)>(.*?)<\/color>/gi, '<span class="stat-green-add">$1</span>')
      .replace(/<tag>([A-Za-z0-9_]+)<\/tag>/gi, (_, tag) => {
        const tagKey = tag.toUpperCase();
        const tagDefs = window.TREE_DATA?.tag_definitions || {};
        const tagName = tagDefs[tagKey]?.name_zh || TAG_MAP[tagKey] || tag;
        return `<u class="tooltip-tag-inline" data-tag-key="${tagKey}" role="button" tabindex="0">${tagName}</u>`;
      })
      .replace(/(?<!<span class="stat-green-add">)\(\+([0-9.]+(?:%|秒|個|次)?)\)(?!<\/span>)/g, '<span class="stat-green-add">(+$1)</span>')
      .replace(/<color=[^>]*>(.*?)<\/color>/gi, '$1')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/<br\s*\/?>/gi, " ")
      .trim();

    return text;
  }

  // Plaintext version for search indexing & labels
  function resolveGameText(value, node) {
    if (!value) return "";
    let str = String(value);
    if (node) {
      if (node.node_type === "PLAYER_PASSIVE") {
        str = str.replace(/\{0\}/g, node.passive_value || "0")
                 .replace(/\{1\}/g, node.passive_rank_add ? `(+${node.passive_rank_add}%)` : "");
      } else if (node.node_type === "DICE_RUNE") {
        str = str.replace(/\{0\}/g, node.rune_value1 || "")
                 .replace(/\{1\}/g, node.rune_value1_rank_add ? `(+${node.rune_value1_rank_add}%)` : (node.rune_value2 || ""))
                 .replace(/\{2\}/g, node.rune_value2 || "")
                 .replace(/\{3\}/g, node.rune_value2_rank_add ? `(+${node.rune_value2_rank_add}%)` : "")
                 .replace(/\{4\}/g, node.rune_duration || "")
                 .replace(/\{5\}/g, node.rune_duration_rank_add ? `(+${node.rune_duration_rank_add}秒)` : "");
      }
    }
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/<tag>([A-Za-z0-9_]+)<\/tag>/gi, (_, tag) => TAG_MAP[tag.toUpperCase()] || tag)
      .replace(/<color=[^>]*>|<\/color>|<br\s*\/?>|<[^>]+>/gi, (m) => m.toLowerCase().startsWith("<br") ? " " : "")
      .replace(/[ \t]+\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function formatValue(value, fallback = "—") {
    if (!value) return fallback;
    return String(value).trim() || fallback;
  }

  function branchData(branch) {
    return FACTION_DATA[Number(branch)] || FACTION_DATA[1];
  }

  function branchColor(branch) {
    return branchData(branch).color;
  }

  function branchName(branch) {
    return branchData(branch).name;
  }

  function nodeTypeName(type) {
    return NODE_TYPE_NAMES[type] || "節點";
  }

  function normalizeSearchString(str) {
    return String(str || "")
      .replace(/渾/g, "混")
      .toLocaleLowerCase("zh-Hant-TW");
  }

  function nodeSearchText(node) {
    const raw = [
      node.name_zh,
      node.short_label,
      node.description_zh,
      node.dice_awaken,
      node.dice_type,
      node.dice_group,
      branchName(node.branch),
      nodeTypeName(node.node_type),
      node.unlock_condition_zh,
      node.icon_name,
    ]
      .map(resolveGameText)
      .join(" ");

    return normalizeSearchString(raw);
  }

  // --- High-Performance Camera & Zoom System (Zero-Reflow & Delta-Time Damped) ---
  function updateViewportSizeCache() {
    state.vpWidth = viewport.clientWidth || window.innerWidth || 1440;
    state.vpHeight = viewport.clientHeight || window.innerHeight || 900;
  }

  function viewportSize() {
    return { width: state.vpWidth, height: state.vpHeight };
  }

  function setNavigating(active, immediate = false) {
    if (active) {
      if (state.navigatingCooldownTimer) {
        clearTimeout(state.navigatingCooldownTimer);
        state.navigatingCooldownTimer = null;
      }
      if (!state.isNavigating) {
        state.isNavigating = true;
        viewport.classList.add("is-navigating");
        document.body.classList.add("is-navigating");
        // 縮放和移動過程中，暫時關閉非釘選的 hover tooltip，移除所有節點的 hover 狀態
        if (!state.tooltipPinned && !tooltip.hidden) {
          closeTooltip();
        }
        state.elementsById.forEach((el) => el.classList.remove("is-hovered"));
      }
    } else {
      if (state.navigatingCooldownTimer) {
        clearTimeout(state.navigatingCooldownTimer);
        state.navigatingCooldownTimer = null;
      }
      if (immediate) {
        state.isNavigating = false;
        viewport.classList.remove("is-navigating");
        document.body.classList.remove("is-navigating");
      } else {
        state.navigatingCooldownTimer = setTimeout(() => {
          state.isNavigating = false;
          viewport.classList.remove("is-navigating");
          document.body.classList.remove("is-navigating");
          state.navigatingCooldownTimer = null;
        }, 120);
      }
    }
  }

  function getPanBounds(scale = state.targetScale) {
    const { width, height } = viewportSize();
    const scaledWidth = MAP_WIDTH * scale;
    const scaledHeight = MAP_HEIGHT * scale;
    // 預留充足的邊界滑動緩衝空間，讓小縮放（如 0.16 ~ 0.5）時依然能自由順暢滑動
    const marginX = Math.max(width * 0.45, 260);
    const marginY = Math.max(height * 0.45, 240);

    let minPanX, maxPanX, minPanY, maxPanY;

    if (scaledWidth <= width) {
      const centerPanX = (width - scaledWidth) / 2;
      minPanX = centerPanX - marginX;
      maxPanX = centerPanX + marginX;
    } else {
      minPanX = width - scaledWidth - marginX;
      maxPanX = marginX;
    }

    if (scaledHeight <= height) {
      const centerPanY = (height - scaledHeight) / 2;
      minPanY = centerPanY - marginY;
      maxPanY = centerPanY + marginY;
    } else {
      minPanY = height - scaledHeight - marginY;
      maxPanY = marginY;
    }

    return { minPanX, maxPanX, minPanY, maxPanY };
  }

  // 高阻力橡皮筋拉伸算法（越界時提供顯著反作用拉力）
  function applyResistance(value, min, max, resistance = 0.25) {
    if (value > max) {
      const overflow = value - max;
      return max + (overflow * 180) / (180 + overflow * (1 / resistance));
    }
    if (value < min) {
      const overflow = min - value;
      return min - (overflow * 180) / (180 + overflow * (1 / resistance));
    }
    return value;
  }

  function clampTargetPan() {
    const { minPanX, maxPanX, minPanY, maxPanY } = getPanBounds(state.scale);
    state.targetPanX = Math.min(maxPanX, Math.max(minPanX, state.targetPanX));
    state.targetPanY = Math.min(maxPanY, Math.max(minPanY, state.targetPanY));
  }

  let isCurrentlyLowLod = false;
  function updateLodState() {
    // 採用 0.8 附近的平滑寬幅遲滯區間（Hysteresis: 0.76 ~ 0.88），配合 CSS 380ms 漸變過渡，肉眼完全無感
    if (!isCurrentlyLowLod && state.scale <= 0.76) {
      isCurrentlyLowLod = true;
      document.body.classList.add("is-low-lod");
    } else if (isCurrentlyLowLod && state.scale >= 0.88) {
      isCurrentlyLowLod = false;
      document.body.classList.remove("is-low-lod");
    }
  }

  function applySceneTransform() {
    scene.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
    updateLodState();
    const targetAnchorId = closingNodeId || state.selectedId;
    if (!tooltip.hidden && targetAnchorId) {
      positionTooltip(targetAnchorId);
    }
  }

  // --- 專屬遊戲相機平滑曲線（由慢溫和加速，過渡至均勻普通速度，精準優雅煞停、絕不拖沓） ---
  function cameraEase(t) {
    // Ken Perlin Smootherstep (6t^5 - 15t^4 + 10t^3)
    // 一階與二階導數在端點均為 0，起步柔和且無瞬發突兀感，終點精準收斂
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // --- 解耦的相機平移與縮放動畫狀態機 ---
  let panAnim = null; // { startX, startY, targetX, targetY, startTime, duration }
  let zoomAnim = null; // { startScale, targetScale, startPanX, startPanY, targetPanX, targetPanY, startTime, duration }
  let animFrameId = null;
  let inertiaRafId = null;
  let wheelZoomRafId = null;
  let targetWheelScale = null;
  let wheelAnchorWorldX = null;
  let wheelAnchorWorldY = null;
  let lastWheelTime = null;

  function stopInertiaPan() {
    if (inertiaRafId) {
      cancelAnimationFrame(inertiaRafId);
      inertiaRafId = null;
    }
    state.isInertia = false;
  }

  function stopSmoothWheelZoom() {
    if (wheelZoomRafId) {
      cancelAnimationFrame(wheelZoomRafId);
      wheelZoomRafId = null;
    }
    targetWheelScale = null;
  }

  function stopAllAnimations() {
    panAnim = null;
    zoomAnim = null;
    stopInertiaPan();
    stopSmoothWheelZoom();
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    state.isLerping = false;
  }

  function startAnimationLoop() {
    if (animFrameId) return;
    state.isLerping = true;
    animFrameId = requestAnimationFrame(animationLoopStep);
  }

  function animationLoopStep(now = performance.now()) {
    let hasRunningAnim = false;

    // 1. 相機平移處理（純平移，完全不干擾縮放 Scale）
    if (panAnim) {
      const elapsed = now - panAnim.startTime;
      const progress = Math.min(1, elapsed / panAnim.duration);
      const eased = cameraEase(progress);

      state.panX = panAnim.startX + (panAnim.targetX - panAnim.startX) * eased;
      state.panY = panAnim.startY + (panAnim.targetY - panAnim.startY) * eased;
      state.targetPanX = state.panX;
      state.targetPanY = state.panY;

      if (progress >= 1) {
        state.panX = panAnim.targetX;
        state.panY = panAnim.targetY;
        panAnim = null;
      } else {
        hasRunningAnim = true;
      }
    }

    // 2. 視角縮放處理（專用錨點縮放插值）
    if (zoomAnim) {
      const elapsed = now - zoomAnim.startTime;
      const progress = Math.min(1, elapsed / zoomAnim.duration);
      const eased = cameraEase(progress);

      state.scale = zoomAnim.startScale + (zoomAnim.targetScale - zoomAnim.startScale) * eased;
      state.targetScale = state.scale;
      state.panX = zoomAnim.startPanX + (zoomAnim.targetPanX - zoomAnim.startPanX) * eased;
      state.panY = zoomAnim.startPanY + (zoomAnim.targetPanY - zoomAnim.startPanY) * eased;
      state.targetPanX = state.panX;
      state.targetPanY = state.panY;

      zoomReadout.textContent = formatZoomPercent(state.scale);

      if (progress >= 1) {
        state.scale = zoomAnim.targetScale;
        state.targetScale = state.scale;
        zoomAnim = null;
      } else {
        hasRunningAnim = true;
      }
    }

    applySceneTransform();
    updateMinimapWindow();

    if (hasRunningAnim) {
      animFrameId = requestAnimationFrame(animationLoopStep);
    } else {
      animFrameId = null;
      state.isLerping = false;
      if (!state.drag?.isDragging) {
        setNavigating(false, true);
      }
    }
  }

  // 發起平滑相機平移（純 Pan，絕不影響使用者當前 Scale）
  function startCameraPan(rawTargetX, rawTargetY, immediate = false, customDuration = null) {
    const { minPanX, maxPanX, minPanY, maxPanY } = getPanBounds(state.scale);
    const targetX = Math.min(maxPanX, Math.max(minPanX, rawTargetX));
    const targetY = Math.min(maxPanY, Math.max(minPanY, rawTargetY));

    if (immediate) {
      panAnim = null;
      state.panX = targetX;
      state.panY = targetY;
      state.targetPanX = targetX;
      state.targetPanY = targetY;
      applySceneTransform();
      updateMinimapWindow();
      if (!zoomAnim && !state.drag?.isDragging) {
        setNavigating(false, true);
      }
      return;
    }

    const startX = state.panX;
    const startY = state.panY;
    const dist = Math.hypot(targetX - startX, targetY - startY);
    if (dist < 0.5) return;

    // 自適應時間：平滑、勻速、舒適（380ms ~ 480ms，由慢到普通速度，絕不拖沓）
    const duration = customDuration || Math.min(480, Math.max(380, 380 + dist * 0.08));

    setNavigating(true);
    panAnim = {
      startX,
      startY,
      targetX,
      targetY,
      startTime: performance.now(),
      duration,
    };
    startAnimationLoop();
  }

  // 縮放專用控制器（以 anchorWorldX/Y 為錨點）
  function startCameraZoom(nextScale, anchorWorldX = null, anchorWorldY = null, immediate = false) {
    const isMobile = window.innerWidth <= 768;
    const effectiveImmediate = immediate || isMobile; // 手機端縮放不需要平滑，即時瞬發
    const minS = getMinScale();
    const maxS = getMaxScale();
    const clampedScale = Math.min(maxS, Math.max(minS, nextScale));
    const { width, height } = viewportSize();
    const cx = width / 2;
    const cy = height / 2;

    const wx = anchorWorldX !== null ? anchorWorldX : (cx - state.panX) / state.scale;
    const wy = anchorWorldY !== null ? anchorWorldY : (cy - state.panY) / state.scale;

    const targetPanX = cx - wx * clampedScale;
    const targetPanY = cy - wy * clampedScale;

    if (effectiveImmediate) {
      zoomAnim = null;
      state.scale = clampedScale;
      state.targetScale = clampedScale;
      state.panX = targetPanX;
      state.panY = targetPanY;
      state.targetPanX = targetPanX;
      state.targetPanY = targetPanY;
      applySceneTransform();
      updateMinimapWindow();
      zoomReadout.textContent = formatZoomPercent(state.scale);
      if (!panAnim && !state.drag?.isDragging) {
        setNavigating(false, true);
      }
      return;
    }

    if (Math.abs(clampedScale - state.scale) < 0.001) return;

    setZooming(true);
    setNavigating(true);
    zoomAnim = {
      startScale: state.scale,
      targetScale: clampedScale,
      startPanX: state.panX,
      startPanY: state.panY,
      targetPanX,
      targetPanY,
      startTime: performance.now(),
      duration: 260,
    };
    startAnimationLoop();
  }

  function setTransform({ immediate = false } = {}) {
    clampTargetPan();
    if (immediate) {
      state.scale = state.targetScale;
      state.panX = state.targetPanX;
      state.panY = state.targetPanY;
      stopAllAnimations();
      applySceneTransform();
      updateMinimapWindow();
      zoomReadout.textContent = formatZoomPercent(state.scale);
      if (!state.drag?.isDragging) {
        setNavigating(false, true);
      }
    } else {
      if (Math.abs(state.targetScale - state.scale) > 0.001) {
        startCameraZoom(state.targetScale, null, null, false);
      } else {
        startCameraPan(state.targetPanX, state.targetPanY, false);
      }
    }
  }

  let zoomingTimer = null;
  function setZooming(isZooming) {
    if (isZooming) {
      document.body.classList.add("is-zooming");
      if (zoomingTimer) clearTimeout(zoomingTimer);
      zoomingTimer = setTimeout(() => {
        document.body.classList.remove("is-zooming");
        zoomingTimer = null;
      }, 260);
    } else {
      if (zoomingTimer) {
        clearTimeout(zoomingTimer);
        zoomingTimer = null;
      }
      document.body.classList.remove("is-zooming");
    }
  }

  // 預設 100% 縮放且位於正中間（手機端 100% 縮放即為 0.5 舒適視野）
  function resetToCenter(immediate = false) {
    const { width, height } = viewportSize();
    const baseScale = getBaseScale();
    state.targetScale = baseScale;
    state.targetPanX = (width - MAP_WIDTH * baseScale) / 2;
    state.targetPanY = (height - MAP_HEIGHT * baseScale) / 2;
    startCameraZoom(baseScale, MAP_WIDTH / 2, MAP_HEIGHT / 2, immediate);
    interactionStatus.textContent = "已重設為 100% 縮放（居中）";
  }

  function fitToViewport(immediate = false) {
    const { width, height } = viewportSize();
    const horizontalRoom = Math.max(300, width - 40);
    const verticalRoom = Math.max(260, height - 80);
    const minS = getMinScale();
    const maxS = getMaxScale();
    const nextScale = Math.min(maxS, Math.max(minS, Math.min(horizontalRoom / MAP_WIDTH, verticalRoom / MAP_HEIGHT)));

    state.targetScale = nextScale;
    state.targetPanX = (width - MAP_WIDTH * nextScale) / 2;
    state.targetPanY = (height - MAP_HEIGHT * nextScale) / 2;
    startCameraZoom(nextScale, MAP_WIDTH / 2, MAP_HEIGHT / 2, immediate);
    interactionStatus.textContent = "已顯示完整骰子樹全景";
  }

  // 縮放始終以「目前畫面中心」為中心錨點
  function setZoom(nextScale, immediate = false) {
    const minS = getMinScale();
    const maxS = getMaxScale();
    const clampedScale = Math.min(maxS, Math.max(minS, nextScale));
    startCameraZoom(clampedScale, null, null, immediate);
    interactionStatus.textContent = `視野縮放：${formatZoomPercent(clampedScale)}`;
  }

  function nodePoint(nodeId) {
    if (state.nodePositions.has(nodeId)) {
      return state.nodePositions.get(nodeId);
    }
    const node = state.nodeById.get(nodeId);
    if (node && typeof node.x === "number" && typeof node.y === "number") {
      const pt = { x: node.x, y: node.y };
      state.nodePositions.set(nodeId, pt);
      return pt;
    }
    return null;
  }

  function centerOnNode(nodeId, immediate = false) {
    const node = state.nodeById.get(nodeId);
    if (!node) return;
    const point = nodePoint(nodeId);
    if (!point) return;

    const { width, height } = viewportSize();
    // 純相機平移：使用當前 scale，絕不干擾縮放
    const currentScale = state.scale;
    const targetX = width / 2 - point.x * currentScale;
    const targetY = height / 2 - point.y * currentScale;

    startCameraPan(targetX, targetY, immediate);
    interactionStatus.textContent = `已定位：${node._nameClean || node.name_zh}`;
  }

  // --- High-Performance Minimap Canvas Rendering (離屏快取 O(1) 瞬發繪製) ---
  function renderMinimap() {
    if (!minimapCanvas || !state.nodes.length) return;
    const ctx = minimapCanvas.getContext("2d");
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;

    if (state.minimapBaseCanvas) {
      ctx.drawImage(state.minimapBaseCanvas, 0, 0);
      return;
    }

    prebakeMinimap();
    if (state.minimapBaseCanvas) {
      ctx.drawImage(state.minimapBaseCanvas, 0, 0);
    }
  }

  function updateMinimapWindow() {
    if (!state.nodes.length || !minimapWindow) return;
    const { width, height } = viewportSize();
    const worldLeft = -state.panX / state.scale;
    const worldTop = -state.panY / state.scale;
    const worldWidth = width / state.scale;
    const worldHeight = height / state.scale;

    // 精確投影到小地圖（保持設備螢幕長寬比與視野完全一致，絕不強制截斷失真）
    const leftPercent = (worldLeft / MAP_WIDTH) * 100;
    const topPercent = (worldTop / MAP_HEIGHT) * 100;
    const widthPercent = (worldWidth / MAP_WIDTH) * 100;
    const heightPercent = (worldHeight / MAP_HEIGHT) * 100;

    minimapWindow.style.left = `${leftPercent}%`;
    minimapWindow.style.top = `${topPercent}%`;
    minimapWindow.style.width = `${widthPercent}%`;
    minimapWindow.style.height = `${heightPercent}%`;
  }

  function onMinimapClick(event) {
    const rect = minimap.getBoundingClientRect();
    const mapX = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const mapY = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
    const { width, height } = viewportSize();

    // 小地圖重定視野：純相機平移，維持當前縮放比例
    const targetX = width / 2 - mapX * state.scale;
    const targetY = height / 2 - mapY * state.scale;
    startCameraPan(targetX, targetY, false);
    interactionStatus.textContent = "已從小地圖重定視野";
  }

  // --- Dice Types & Groups Traditional Chinese Mapping ---
  const DICE_TYPE_ZH = {
    Fire: "火",
    Trap: "尖刺",
    Flower: "花",
    Pillar: "巨石",
    Wind: "風",
    Light: "光",
    Ice: "冰",
    Poison: "毒",
    Iron: "鐵甲",
    Switch: "換位",
    Gear: "齒輪",
    Element: "原子",
    Neon: "霓虹",
    SawBlade: "鋸齒",
    Mine: "礦山",
    Sniper: "狙擊",
    Ray: "光線",
    Electric: "電",
    Resonance: "共鳴",
    Shuriken: "魔彈",
    Summon: "召喚",
    Combo: "連擊",
    Adjust: "適應",
    Potion: "煉金",
    Bubble: "泡泡",
    Lock: "封印",
    Punch: "審判",
    BrokenGrowth: "成長",
    Executioner: "執行",
    Blessing: "祝福",
    Alignment: "排序",
    Bingo: "陰陽",
    Solitude: "孤獨",
    Fear: "恐懼",
    Tyrant: "暴君",
    Doom: "破滅",
    Mutation: "變異",
    Box: "貪婪",
    Predator: "吞噬",
    Death: "空虛",
    Decay: "腐敗",
  };

  const DICE_GROUP_ZH = {
    Nature: "自然",
    Engineering: "工學",
    Magic: "魔法",
    Guardian: "秩序",
    Invader: "渾沌",
  };

  function formatDiceType(val) {
    if (!val) return "";
    return DICE_TYPE_ZH[val] || val;
  }

  function formatDiceGroup(val) {
    if (!val) return "";
    return DICE_GROUP_ZH[val] || val;
  }

  // --- Official Game Assets (Sprite 185: Gold, Sprite 186: Dice Core) ---
  const SVG_ICONS = {
    stats: `<svg class="section-icon-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"></path><path d="M13 19l6-6"></path><path d="M16 16l4 4"></path><path d="M19 21l2-2"></path></svg>`,
    skill: `<svg class="section-icon-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`,
    awakening: `<svg class="section-icon-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    unlock: `<svg class="section-icon-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`,
    upgrade: `<svg class="section-icon-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
    gold: `<svg class="currency-icon-svg gold-icon" viewBox="0 0 1 1" aria-hidden="true"><use href="#sprite-185" xlink:href="#sprite-185"></use></svg>`,
    core: `<svg class="currency-icon-svg core-icon" viewBox="0 0 1 1" aria-hidden="true"><use href="#sprite-186" xlink:href="#sprite-186"></use></svg>`,
  };

  function formatCostHtml(gold, core) {
    const parts = [];
    if (gold > 0) {
      parts.push(`${SVG_ICONS.gold} ${gold.toLocaleString()}`);
    }
    if (core > 0) {
      parts.push(`${SVG_ICONS.core} ${core.toLocaleString()}`);
    }
    return parts.join(" · ");
  }

  // --- 3 系列骰子與符文高清圖示映射表 ---
  const DICE_3_ALIASES = {
    Trap: "Dice_Thorn3.png",
    Fear: "Dice_TRANSFER3.png",
    Box: "Dice_Slow3.png",
    Death: "Dice_SPEEDGUN3.png",
    Decay: "Dice_Crack3.png",
    Solitude: "Dice_Solitude_3.png",
    Fire: "Dice_fire3.png",
    Ice: "Dice_ICE3.png",
    Iron: "Dice_iron_3.png",
    Bubble: "Dice_BUBBLE3.png",
    Bingo: "Dice_BINGO3.png",
    Flower: "Dice_Flower3.png",
    Lock: "Dice_Lock3.png",
    Punch: "Dice_Punch3.png",
    BrokenGrowth: "Dice_BrokenGrowth3.png",
    Executioner: "Dice_Executioner3.png",
    Blessing: "Dice_Blessing3.png",
    Alignment: "Dice_Alignment3.png",
    Tyrant: "Dice_Tyrant3.png",
    Doom: "Dice_Doom3.png",
    Mutation: "Dice_Mutation3.png",
    Predator: "Dice_Predator3.png",
    Potion: "Dice_Potion3.png",
    Switch: "Dice_Switch3.png",
    Gear: "Dice_Gear3.png",
    Wind: "Dice_Wind3.png",
    Light: "Dice_Light3.png",
    Poison: "Dice_Poison3.png",
    Summon: "Dice_summon3.png",
    Combo: "Dice_Combo3.png",
    Adjust: "Dice_Adjust3.png",
    Pillar: "Dice_Pillar3.png",
    Mine: "Dice_Mine3.png",
    Sniper: "Dice_Sniper3.png",
    Ray: "Dice_Ray3.png",
    Electric: "Dice_Electric3.png",
    Resonance: "Dice_Resonance3.png",
    Shuriken: "Dice_shuriken3.png",
    Element: "Dice_Element3.png",
    Neon: "Dice_Neon3.png",
    SawBlade: "Dice_SawBlade3.png",
  };

  function resolveNode3Icon(node) {
    if (!node) return null;

    // 嚴格規範：小節點沒有 3.png，只有骰子（DICE 大節點）才顯示 3 系列圖示
    if (node.node_type !== "DICE") {
      return null;
    }

    // 1. 別名精準映射（如 Light -> Dice_Light3.png, Trap -> Dice_Thorn3.png 等）
    const dType = node.dice_type;
    if (dType && DICE_3_ALIASES[dType]) {
      return DICE_3_ALIASES[dType];
    }

    // 2. 骰子節點（DICE）：若有 icon_name 則將結尾數字轉為 3，或使用 Dice_${dice_type}3.png
    if (node.icon_name) {
      return node.icon_name.replace(/\d+$/, "3") + ".png";
    }
    if (node.dice_type) {
      return `Dice_${node.dice_type}3.png`;
    }

    return null;
  }

  // --- Pre-compiled Tooltip DOM Cache (加載期預構建，徹底消除每次點擊的 DOM 建立負載) ---
  function buildNodeDetailFragment(node) {
    const maxRank = Number(node.max_rank) || 1;
    const fragment = document.createDocumentFragment();

    // 1. 核心效果（遊戲內原生排版，文案色 #9789AE，底線標籤詞彙）
    const descHtml = formatGameText(node.description_zh, node);
    if (descHtml) {
      const section = document.createElement("div");
      section.className = "detail-section";
      const p = document.createElement("p");
      p.className = "detail-copy";
      p.innerHTML = descHtml;
      section.append(p);

      // 下方 #標籤 膠囊列（嚴格僅提取說明文案中真正被 <tag> 包裹的標籤機制）
      const tagDefs = window.TREE_DATA?.tag_definitions || {};
      const relevantTags = [];
      const tagMatches = descHtml.matchAll(/data-tag-key="([^"]+)"/g);
      for (const match of tagMatches) {
        const tKey = match[1];
        if (tagDefs[tKey] && !relevantTags.includes(tKey)) relevantTags.push(tKey);
      }

      if (relevantTags.length > 0) {
        const hashtagRow = document.createElement("div");
        hashtagRow.className = "tooltip-hashtag-row";
        relevantTags.forEach(tKey => {
          const tDef = tagDefs[tKey];
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "tooltip-hashtag-chip";
          btn.setAttribute("data-tag-key", tKey);
          btn.textContent = `#${tDef.name_zh || tKey}`;
          hashtagRow.append(btn);
        });
        section.append(hashtagRow);
      }

      fragment.append(section);
    }

    // 2. 覺醒效果（若有）
    const awakenHtml = formatGameText(node.dice_awaken, node);
    if (awakenHtml) {
      const section = document.createElement("div");
      section.className = "detail-section";
      const label = document.createElement("span");
      label.className = "section-label";
      label.textContent = "覺醒效果";
      const p = document.createElement("p");
      p.className = "detail-copy";
      p.innerHTML = awakenHtml;
      section.append(label, p);
      fragment.append(section);
    }

    // 3. 骰子專屬 2 欄式屬性網格（完全比對遊戲截圖 2）
    if (node.node_type === "DICE") {
      const divider = document.createElement("hr");
      divider.className = "tooltip-divider";
      fragment.append(divider);

      const grid = document.createElement("div");
      grid.className = "dice-stat-grid";

      // 項目 1: 攻擊力
      const atkItem = document.createElement("div");
      atkItem.className = "dice-stat-item";
      atkItem.innerHTML = `
        <div class="dice-stat-icon-box">
          <img src="icons/Attack_Icon.png" alt="攻擊力" />
        </div>
        <div class="dice-stat-text">
          <span class="dice-stat-label">攻擊力</span>
          <span class="dice-stat-val"><span class="stat-base-val">${node.dice_attack || "0"}</span><span class="stat-bonus-val dice-stat-bonus-atk is-gold" hidden></span></span>
        </div>
      `;
      grid.append(atkItem);

      // 項目 2: 攻擊速度
      const spdItem = document.createElement("div");
      spdItem.className = "dice-stat-item";
      spdItem.innerHTML = `
        <div class="dice-stat-icon-box">
          <img src="icons/attackspeed_icon.png" alt="攻擊速度" />
        </div>
        <div class="dice-stat-text">
          <span class="dice-stat-label">攻擊速度</span>
          <span class="dice-stat-val"><span class="stat-base-val">${node.dice_attack_interval || "0"}</span><span class="stat-bonus-val dice-stat-bonus-spd is-purple" hidden></span></span>
        </div>
      `;
      grid.append(spdItem);

      // 項目 3: 目標
      const targetItem = document.createElement("div");
      targetItem.className = "dice-stat-item";
      targetItem.innerHTML = `
        <div class="dice-stat-icon-box">
          <img src="icons/targetingtype_icon.png" alt="目標" />
        </div>
        <div class="dice-stat-text">
          <span class="dice-stat-label">目標</span>
          <span class="dice-stat-val"><span class="stat-base-val">${node.dice_target_zh || "前方"}</span></span>
        </div>
      `;
      grid.append(targetItem);

      // 項目 4+: 特殊數值（從解包數據取出）
      if (Array.isArray(node.special_stats)) {
        node.special_stats.forEach((st, idx) => {
          const sItem = document.createElement("div");
          sItem.className = "dice-stat-item";
          sItem.innerHTML = `
            <div class="dice-stat-icon-box">
              <img src="icons/${st.icon || "NodeAttackIcon.png"}" alt="${st.label}" onerror="this.src='icons/Attack_Icon.png'" />
            </div>
            <div class="dice-stat-text">
              <span class="dice-stat-label">${st.label}</span>
              <span class="dice-stat-val"><span class="stat-base-val">${st.value}</span><span class="stat-bonus-val dice-stat-bonus-special is-gold" data-index="${idx}" hidden></span></span>
            </div>
          `;
          grid.append(sItem);
        });
      }

      fragment.append(grid);

      // 底部操作列：「強化」與「提升骰點」切換按鈕（對齊遊戲原生介面）
      const btnBar = document.createElement("div");
      btnBar.className = "dice-upgrade-action-bar";
      btnBar.innerHTML = `
        <button type="button" class="dice-upgrade-btn btn-powerup" data-mode="powerup">強化</button>
        <button type="button" class="dice-upgrade-btn btn-dot" data-mode="dot">提升骰點</button>
      `;
      fragment.append(btnBar);
    } else {
      // 非骰子節點（符文、被動、支援）：若有持續時間等屬性，以精簡標籤呈現
      const statItems = [];
      if (node.rune_duration) statItems.push(["持續時間", `${node.rune_duration} 秒`]);
      if (node.dice_group) statItems.push(["群組", formatDiceGroup(node.dice_group)]);

      if (statItems.length > 0) {
        const ul = document.createElement("ul");
        ul.className = "stat-compact-list";
        statItems.forEach(([l, v]) => {
          const li = document.createElement("li");
          li.className = "stat-compact-item";
          li.innerHTML = `<span class="stat-label">${l}</span><span class="stat-value">${v}</span>`;
          ul.append(li);
        });
        fragment.append(ul);
      }

      // 4. 元數據區（消耗、前置與升階表格：專供符文、被動、支援節點使用）
      const metaBox = document.createElement("div");
      metaBox.className = "tooltip-meta-box";

      const goldCosts = Array.isArray(node.gold_costs) ? node.gold_costs : [];
      const coreCosts = Array.isArray(node.core_costs) ? node.core_costs : [];
      const unlockGold = goldCosts[0] ?? node.unlock_gold ?? 0;
      const unlockCore = coreCosts[0] ?? node.unlock_core ?? 0;
      const totalGold = node.total_gold ?? goldCosts.reduce((a, b) => a + b, 0);
      const totalCore = node.total_core ?? coreCosts.reduce((a, b) => a + b, 0);

      const specialUnlock = SPECIAL_UNLOCK_CONDITIONS[node.id];
      if (specialUnlock) {
        const lineSpecial = document.createElement("div");
        lineSpecial.className = "meta-line";
        lineSpecial.innerHTML = `
          <span>解鎖途徑</span>
          <span class="meta-cost" style="color: #ffd859; font-weight: 700;">${specialUnlock.label}</span>
        `;
        metaBox.append(lineSpecial);
      } else if (unlockGold > 0 || unlockCore > 0) {
        const lineUnlock = document.createElement("div");
        lineUnlock.className = "meta-line meta-line-cost";
        const parts = [];
        if (unlockGold > 0) parts.push(`${SVG_ICONS.gold} ${unlockGold.toLocaleString()}`);
        if (unlockCore > 0) parts.push(`${SVG_ICONS.core} ${unlockCore.toLocaleString()}`);
        lineUnlock.innerHTML = `<span class="cost-label">解鎖消耗</span><span class="meta-cost">${parts.join(" ")}</span>`;
        metaBox.append(lineUnlock);
      }

      // 階級滑桿（長膠囊滑軌 + 橢圓形微互動滑塊，僅多階節點顯示）
      if (maxRank > 1) {
        const sliderWrap = document.createElement("div");
        sliderWrap.className = "rank-slider-wrap";

        const sliderHeader = document.createElement("div");
        sliderHeader.className = "slider-header";
        sliderHeader.innerHTML = `
          <span class="slider-title">階級調整</span>
          <span class="slider-rank-display">第 <strong class="slider-rank-current">1</strong> / ${maxRank} 階</span>
        `;

        const trackWrap = document.createElement("div");
        trackWrap.className = "slider-track-container";

        const sliderInput = document.createElement("input");
        sliderInput.type = "range";
        sliderInput.className = "rank-slider-input";
        sliderInput.min = "1";
        sliderInput.max = String(maxRank);
        sliderInput.value = "1";
        sliderInput.step = "1";
        sliderInput.setAttribute("aria-label", "調整階級預覽");
        sliderInput.style.setProperty("--slider-pct", "0%");

        const sliderCostRow = document.createElement("div");
        sliderCostRow.className = "slider-cost-row";
        const initialCostParts = [];
        if (unlockGold > 0) initialCostParts.push(`${SVG_ICONS.gold} ${unlockGold.toLocaleString()}`);
        if (unlockCore > 0) initialCostParts.push(`${SVG_ICONS.core} ${unlockCore.toLocaleString()}`);
        sliderCostRow.innerHTML = `
          <span class="slider-cost-label">累計消耗</span>
          <span class="slider-cost-value">${initialCostParts.length > 0 ? initialCostParts.join(" ") : "—"}</span>
        `;

        trackWrap.append(sliderInput);
        sliderWrap.append(sliderHeader, trackWrap, sliderCostRow);
        metaBox.append(sliderWrap);
      }

      const incomingIds = node.incoming || [];
      const incomingNodes = incomingIds
        .map((id) => state.nodeById.get(id))
        .filter(Boolean);

      if (incomingNodes.length > 0) {
        const linePre = document.createElement("div");
        linePre.className = "meta-line";
        linePre.innerHTML = `<span>前置節點</span>`;
        const pillWrap = document.createElement("span");
        incomingNodes.forEach((inc) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "node-link-pill";
          btn.setAttribute("data-target-id", inc.id);
          btn.textContent = `${inc._nameClean || formatValue(inc.name_zh)} →`;
          btn.title = `跳轉至 ${inc._nameClean || inc.name_zh}`;
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            centerOnNode(inc.id, true);
            showTooltip(inc.id, true);
          });
          pillWrap.append(btn);
        });
        linePre.append(pillWrap);
        metaBox.append(linePre);
      } else if (node.is_base) {
        const lineBase = document.createElement("div");
        lineBase.className = "meta-line";
        lineBase.innerHTML = `<span>起點</span><span>核心初始節點</span>`;
        metaBox.append(lineBase);
      }

      fragment.append(metaBox);
    }

    return fragment;
  }

  function precompileTooltipPanels() {
    state.tooltipDomCache.clear();
    state.nodes.forEach((node) => {
      state.tooltipDomCache.set(node.id, buildNodeDetailFragment(node));
    });
  }

  // --- Tooltip Rendering (Clean, Compact, High-Utility Card) ---
  function renderDetailPanel(node) {
    const fData = branchData(node.branch);
    const type = nodeTypeName(node.node_type);
    const maxRank = Number(node.max_rank) || 1;
    const isDice = node.node_type === "DICE";

    tooltip.classList.toggle("is-dice-node", isDice);
    tooltip.classList.toggle("is-non-dice", !isDice);

    tooltip.style.setProperty("--node-faction", fData.color);
    tooltip.style.setProperty("--node-faction-surface", fData.surface);
    tooltip.style.setProperty("--node-faction-border", fData.border);
    tooltip.style.setProperty("--node-faction-ink", fData.ink);

    tooltipBranchBadge.textContent = fData.name;
    tooltipTypeBadge.textContent = type;
    
    // 階級標籤：1/1 不顯示，多階節點顯示 1/{maxRank}
    if (maxRank > 1) {
      tooltipRankBadge.hidden = false;
      tooltipRankBadge.style.display = "";
      tooltipRankBadge.textContent = `1/${maxRank}`;
    } else {
      tooltipRankBadge.hidden = true;
      tooltipRankBadge.style.display = "none";
    }

    tooltipTitle.textContent = node._nameClean || formatValue(node.name_zh, "未命名節點");


    // 渲染 3 系列 PNG 圖示（放大兩倍 136px，上 1/3 破格超出 Tooltip 頂部，僅骰子大節點顯示）
    const iconFilename = resolveNode3Icon(node);
    if (iconFilename && tooltipDiceImg) {
      tooltipDiceImg.src = `icons/${iconFilename}`;
      tooltipDiceImg.alt = node._nameClean || node.name_zh || "骰子圖示";
      tooltipDiceImg.hidden = false;
      if (tooltipDiceVisual) tooltipDiceVisual.style.display = "";
    } else if (tooltipDiceImg) {
      tooltipDiceImg.src = "";
      tooltipDiceImg.hidden = true;
      if (tooltipDiceVisual) tooltipDiceVisual.style.display = "none";
    }

    // 零成本 O(1) 取出預編譯之 DocumentFragment
    let cachedFragment = state.tooltipDomCache.get(node.id);
    if (!cachedFragment) {
      cachedFragment = buildNodeDetailFragment(node);
      state.tooltipDomCache.set(node.id, cachedFragment);
    }

    const cloned = cachedFragment.cloneNode(true);
    // 綁定前置跳轉按鈕事件
    cloned.querySelectorAll(".node-link-pill").forEach((btn) => {
      const targetId = btn.getAttribute("data-target-id");
      if (targetId) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          centerOnNode(targetId, false);
          showTooltip(targetId, true);
        });
      }
    });

    // 綁定階級滑桿即時聯動與邊界阻尼回彈物理引擎 (Elastic Rubber-banding & Spring Engine)
    const sliderInput = cloned.querySelector(".rank-slider-input");
    if (sliderInput) {
      const goldCosts = Array.isArray(node.gold_costs) ? node.gold_costs : [];
      const coreCosts = Array.isArray(node.core_costs) ? node.core_costs : [];
      const unlockGold = goldCosts[0] ?? node.unlock_gold ?? 0;
      const unlockCore = coreCosts[0] ?? node.unlock_core ?? 0;

      let cumGoldArr = [0];
      let cumCoreArr = [0];
      let gSum = 0;
      let cSum = 0;
      for (let i = 0; i < maxRank; i++) {
        gSum += goldCosts[i] || 0;
        cSum += coreCosts[i] || 0;
        cumGoldArr.push(gSum);
        cumCoreArr.push(cSum);
      }

      let isDragging = false;
      let activePointerId = null;

      function updateSliderUI(rank, pct, overshootX = 0) {
        sliderInput.value = String(rank);
        sliderInput.style.setProperty("--slider-pct", `${pct}%`);
        sliderInput.style.setProperty("--overshoot-x", `${overshootX.toFixed(2)}px`);

        // 1. 更新滑桿標頭階級數與頂部階級徽章
        const rankCurEl = tooltipBody.querySelector(".slider-rank-current");
        if (rankCurEl) rankCurEl.textContent = rank;
        if (tooltipRankBadge) tooltipRankBadge.textContent = `${rank}/${maxRank}`;

        // 2. 即時計算並更新核心描述文案數值
        const copyEl = tooltipBody.querySelector(".detail-copy");
        if (copyEl) {
          copyEl.innerHTML = formatGameText(node.description_zh, node, rank);
        }

        // 3. 更新累計消耗數值
        const costValEl = tooltipBody.querySelector(".slider-cost-value");
        if (costValEl) {
          const curG = cumGoldArr[rank] || 0;
          const curC = cumCoreArr[rank] || 0;
          const parts = [];
          if (curG > 0) parts.push(`${SVG_ICONS.gold} ${curG.toLocaleString()}`);
          if (curC > 0) parts.push(`${SVG_ICONS.core} ${curC.toLocaleString()}`);
          costValEl.innerHTML = parts.length > 0 ? parts.join(" ") : "—";
        }

        // 4. 動態更新單階消耗（第 1 階顯示「解鎖消耗」，第 2+ 階顯示「升階消耗」及該級單階價格）
        const costLine = tooltipBody.querySelector(".meta-line-cost");
        if (costLine) {
          const costLabelEl = costLine.querySelector(".cost-label");
          const costValSingleEl = costLine.querySelector(".meta-cost");
          if (rank === 1) {
            if (costLabelEl) costLabelEl.textContent = "解鎖消耗";
            const parts = [];
            if (unlockGold > 0) parts.push(`${SVG_ICONS.gold} ${unlockGold.toLocaleString()}`);
            if (unlockCore > 0) parts.push(`${SVG_ICONS.core} ${unlockCore.toLocaleString()}`);
            if (costValSingleEl) costValSingleEl.innerHTML = parts.length > 0 ? parts.join(" ") : "—";
          } else {
            if (costLabelEl) costLabelEl.textContent = "升階消耗";
            const curRankGold = goldCosts[rank - 1] || 0;
            const curRankCore = coreCosts[rank - 1] || 0;
            const parts = [];
            if (curRankGold > 0) parts.push(`${SVG_ICONS.gold} ${curRankGold.toLocaleString()}`);
            if (curRankCore > 0) parts.push(`${SVG_ICONS.core} ${curRankCore.toLocaleString()}`);
            if (costValSingleEl) costValSingleEl.innerHTML = parts.length > 0 ? parts.join(" ") : "—";
          }
        }
      }

      function handlePointerMove(e) {
        if (!isDragging || e.pointerId !== activePointerId) return;
        const rect = sliderInput.getBoundingClientRect();
        if (!rect.width) return;

        const rawOffset = e.clientX - rect.left;
        const progress = rawOffset / rect.width;

        let rank = 1;
        let pct = 0;
        let overshootX = 0;

        if (progress < 0) {
          // 向左過度拉伸：經典非線性阻尼 (Rubber-band Resistance at 0%)
          const deltaX = rawOffset; // 負值
          const k = 48;
          const maxOvershoot = 26; // 最大拉伸像素
          overshootX = - (Math.abs(deltaX) * maxOvershoot) / (Math.abs(deltaX) + k);
          rank = 1;
          pct = 0;
        } else if (progress > 1) {
          // 向右過度拉伸：經典非線性阻尼 (Rubber-band Resistance at 100%)
          const deltaX = rawOffset - rect.width; // 正值
          const k = 48;
          const maxOvershoot = 26;
          overshootX = (deltaX * maxOvershoot) / (deltaX + k);
          rank = maxRank;
          pct = 100;
        } else {
          // 正常範圍
          rank = Math.round(1 + progress * (maxRank - 1));
          rank = Math.max(1, Math.min(maxRank, rank));
          pct = maxRank > 1 ? ((rank - 1) / (maxRank - 1)) * 100 : 0;
          overshootX = 0;
        }

        updateSliderUI(rank, pct, overshootX);
      }

      function handlePointerDown(e) {
        if (e.button !== 0) return;
        isDragging = true;
        activePointerId = e.pointerId;
        sliderInput.classList.add("is-dragging");
        sliderInput.classList.remove("is-springing");
        try {
          sliderInput.setPointerCapture(activePointerId);
        } catch (_) {}
        handlePointerMove(e);
      }

      function handlePointerUp(e) {
        if (!isDragging || (activePointerId !== null && e.pointerId !== activePointerId)) return;
        isDragging = false;
        try {
          sliderInput.releasePointerCapture(activePointerId);
        } catch (_) {}
        activePointerId = null;

        sliderInput.classList.remove("is-dragging");
        sliderInput.classList.add("is-springing");

        // 觸發物理彈簧回彈 (Spring Bounce Back to 0px)
        sliderInput.style.setProperty("--overshoot-x", "0px");
        setTimeout(() => {
          sliderInput.classList.remove("is-springing");
        }, 380);
      }

      sliderInput.addEventListener("pointerdown", handlePointerDown);
      sliderInput.addEventListener("pointermove", handlePointerMove);
      sliderInput.addEventListener("pointerup", handlePointerUp);
      sliderInput.addEventListener("pointercancel", handlePointerUp);

      // 相容鍵盤 / 自動化測試原生 input 事件
      sliderInput.addEventListener("input", (e) => {
        if (isDragging) return;
        const rank = parseInt(e.target.value, 10) || 1;
        const pct = maxRank > 1 ? ((rank - 1) / (maxRank - 1)) * 100 : 0;
        updateSliderUI(rank, pct, 0);
      });
    }

    tooltipBody.replaceChildren(cloned);

    // 綁定骰子節點「強化」與「提升骰點」切換事件
    const powerupBtn = tooltipBody.querySelector(".btn-powerup");
    const dotBtn = tooltipBody.querySelector(".btn-dot");
    if (powerupBtn && dotBtn) {
      let currentMode = "none"; // 'none' | 'powerup' | 'dot'

      const updateDiceStatsView = (mode) => {
        currentMode = mode;
        powerupBtn.classList.toggle("is-active", mode === "powerup");
        dotBtn.classList.toggle("is-active", mode === "dot");

        const pData = node.powerup_data || {};
        const dData = node.dot_data || {};

        // 1. 攻擊力增量 (強化為金黃色，提升骰點為紫色)
        const atkBonusEl = tooltipBody.querySelector(".dice-stat-bonus-atk");
        if (atkBonusEl) {
          const add = mode === "powerup" ? pData.attack_add : (mode === "dot" ? dData.attack_add : "");
          if (add) {
            atkBonusEl.textContent = ` (${add})`;
            atkBonusEl.className = `stat-bonus-val dice-stat-bonus-atk ${mode === "powerup" ? "is-gold" : "is-purple"}`;
            atkBonusEl.hidden = false;
          } else {
            atkBonusEl.hidden = true;
          }
        }

        // 2. 攻擊速度增量 (紫色)
        const spdBonusEl = tooltipBody.querySelector(".dice-stat-bonus-spd");
        if (spdBonusEl) {
          const add = mode === "powerup" ? pData.interval_add : (mode === "dot" ? dData.interval_add : "");
          if (add) {
            spdBonusEl.textContent = ` (${add})`;
            spdBonusEl.className = `stat-bonus-val dice-stat-bonus-spd is-purple`;
            spdBonusEl.hidden = false;
          } else {
            spdBonusEl.hidden = true;
          }
        }

        // 3. 特殊屬性增量
        const specialBonusEls = tooltipBody.querySelectorAll(".dice-stat-bonus-special");
        specialBonusEls.forEach((el) => {
          const idx = parseInt(el.getAttribute("data-index"), 10);
          const list = mode === "powerup" ? (pData.special_stats || []) : (mode === "dot" ? (dData.special_stats || []) : []);
          const st = list[idx];
          if (st && st.add) {
            el.textContent = ` (${st.add})`;
            el.className = `stat-bonus-val dice-stat-bonus-special is-gold`;
            el.hidden = false;
          } else {
            el.hidden = true;
          }
        });
      };

      powerupBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        updateDiceStatsView(currentMode === "powerup" ? "none" : "powerup");
      });

      dotBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        updateDiceStatsView(currentMode === "dot" ? "none" : "dot");
      });
    }
  }

  // --- Smart Contextual Tooltip Positioning (零 Reflow 純幾何換算，消除逐幀 Layout Thrashing) ---
  let cachedTipWidth = 440;
  let cachedTipHeight = 320;

  function updateTooltipSizeCache() {
    if (!tooltip.hidden) {
      cachedTipWidth = tooltip.offsetWidth || cachedTipWidth;
      cachedTipHeight = tooltip.offsetHeight || cachedTipHeight;
    }
  }

  function positionTooltip(nodeId, forceMeasure = false) {
    const pt = state.nodePositions.get(nodeId);
    if (!pt) return;

    if (forceMeasure) {
      updateTooltipSizeCache();
    }

    // 純數學轉換：世界座標 -> 螢幕像素座標（0 次 DOM 重排，極速流暢）
    const screenX = state.panX + pt.x * state.scale;
    const screenY = state.panY + pt.y * state.scale;

    // 節點半徑在螢幕上的縮放尺寸
    const node = state.nodeById.get(nodeId);
    const isLarge = node?.node_type === "DICE" || node?.node_type === "PERK";
    const nodeRadius = (isLarge ? 52 : 36) * state.scale;
    const gap = 16;

    let top;
    // 空間感知智能定位：若節點下方空間足夠，置於下方；否則若上方空間足夠，置於上方；空間緊湊時動態鉗制
    const fitsBelow = screenY + nodeRadius + gap + cachedTipHeight <= window.innerHeight - 16;
    const fitsAbove = screenY - nodeRadius - cachedTipHeight - gap >= 16;

    if (fitsBelow) {
      top = screenY + nodeRadius + gap;
    } else if (fitsAbove) {
      top = screenY - nodeRadius - cachedTipHeight - gap;
    } else {
      // 螢幕空間緊湊時，優先讓 Tooltip 在可視區域內完整顯示
      top = Math.max(16, Math.min(window.innerHeight - 16 - cachedTipHeight, screenY - cachedTipHeight / 2));
    }

    let left = screenX - cachedTipWidth / 2;
    if (left < 16) left = 16;
    if (left + cachedTipWidth > window.innerWidth - 16) {
      left = window.innerWidth - 16 - cachedTipWidth;
    }

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  // --- Tag Micro-Tooltip Popover System ---
  const tagPopover = document.getElementById("tag-popover");
  const tagPopoverBadge = document.getElementById("tag-popover-badge");
  const tagPopoverDesc = document.getElementById("tag-popover-desc");

  function showTagPopover(tagKey, targetEl) {
    if (!tagPopover || !tagKey || !targetEl) return;
    const tagDefs = window.TREE_DATA?.tag_definitions || {};
    const tDef = tagDefs[tagKey];
    if (!tDef) return;

    tagPopoverBadge.textContent = `#${tDef.name_zh || tagKey}`;
    tagPopoverDesc.textContent = tDef.desc_zh || "暫無詳細機制說明。";

    tagPopover.hidden = false;
    tagPopover.setAttribute("aria-hidden", "false");

    const rect = targetEl.getBoundingClientRect();
    const popWidth = Math.min(280, window.innerWidth - 32);
    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - popWidth / 2;

    if (left < 16) left = 16;
    if (left + popWidth > window.innerWidth - 16) {
      left = window.innerWidth - 16 - popWidth;
    }

    if (top + 110 > window.innerHeight) {
      top = rect.top - 100;
    }

    tagPopover.style.left = `${Math.round(left)}px`;
    tagPopover.style.top = `${Math.round(top)}px`;
  }

  function hideTagPopover() {
    if (!tagPopover || tagPopover.hidden) return;
    tagPopover.hidden = true;
    tagPopover.setAttribute("aria-hidden", "true");
  }

  let sheetDismissTimer = null;
  let tooltipCloseTimer = null;
  let tooltipSwitchTimer = null;
  let tooltipEnterTimer = null;
  let closingNodeId = null;

  function showTooltip(nodeId, pinned = false) {
    hideTagPopover();
    if (sheetDismissTimer) {
      clearTimeout(sheetDismissTimer);
      sheetDismissTimer = null;
    }
    if (tooltipCloseTimer) {
      clearTimeout(tooltipCloseTimer);
      tooltipCloseTimer = null;
    }
    if (tooltipSwitchTimer) {
      clearTimeout(tooltipSwitchTimer);
      tooltipSwitchTimer = null;
    }
    if (tooltipEnterTimer) {
      clearTimeout(tooltipEnterTimer);
      tooltipEnterTimer = null;
    }

    const node = state.nodeById.get(nodeId);
    if (!node) return;

    const isSameNodeAlreadySelected = (
      state.selectedId === nodeId &&
      !tooltip.hidden &&
      tooltip.classList.contains("is-active") &&
      !tooltip.classList.contains("is-closing")
    );

    if (isSameNodeAlreadySelected) {
      // 冪等保護：若當前節點已處於選取狀態，保持選取框動畫持續播放與 Tooltip 內容穩定，絕不重置或閃爍
      tooltip.classList.toggle("is-pinned", pinned);
      return;
    }

    const oldSelectedId = state.selectedId;
    state.selectedId = nodeId;
    state.tooltipPinned = pinned;

    // 清除所有節點的選取與關聯選取
    state.elementsById.forEach((element) => {
      element.classList.remove("is-selected", "is-linked-selected");
    });

    // 標記當前選取節點
    const currentEl = state.elementsById.get(nodeId);
    currentEl?.classList.add("is-selected");

    // 聯動選取邏輯：
    // 1. 若點擊骰子：顯示骰子自己，並聯動顯示關聯的三個符文選擇框
    // 2. 若點擊符文：顯示三個符文的選擇框，不會顯示骰子的選擇框
    const nType = node.node_type;
    const diceName = node.dice_type || node.rune_dice;
    if (diceName) {
      state.nodeById.forEach((n) => {
        if (n.id === nodeId) return;
        if (nType === "DICE_RUNE") {
          // 點擊符文：只聯動同組的其他符文（不包含骰子）
          if (n.node_type === "DICE_RUNE" && (n.rune_dice === diceName || n.dice_type === diceName)) {
            state.elementsById.get(n.id)?.classList.add("is-linked-selected");
          }
        } else if (nType === "DICE") {
          // 點擊骰子：聯動其關聯的三個符文
          if (n.node_type === "DICE_RUNE" && (n.rune_dice === diceName || n.dice_type === diceName)) {
            state.elementsById.get(n.id)?.classList.add("is-linked-selected");
          }
        }
      });
    }

    const doEnter = () => {
      closingNodeId = null;
      renderDetailPanel(node);
      tooltip.classList.toggle("is-pinned", pinned);
      tooltip.classList.remove("is-closing");
      tooltip.hidden = false;
      tooltip.classList.remove("is-active", "is-entering");
      void tooltip.offsetWidth;
      tooltip.classList.add("is-active", "is-entering");
      positionTooltip(nodeId, true);
      tooltipSwitchTimer = setTimeout(() => {
        tooltip.classList.remove("is-entering");
        tooltipSwitchTimer = null;
      }, 260);
    };

    // 一律播放出場與入場動畫（在鏡頭開始移動與 Tooltip 入場之間增加適度層次延遲）
    const isCurrentlyActive = !tooltip.hidden && tooltip.classList.contains("is-active") && !tooltip.classList.contains("is-closing");
    if (isCurrentlyActive) {
      // 舊 Tooltip 100% 錨定在舊節點原處播放出場縮小動畫（130ms），退場後稍作留白，等鏡頭滑行接近定位時展開新卡片
      closingNodeId = oldSelectedId || nodeId;
      tooltip.classList.remove("is-entering");
      tooltip.classList.add("is-closing");
      tooltipSwitchTimer = setTimeout(() => {
        tooltip.hidden = true;
        tooltip.classList.remove("is-closing", "is-active");
        tooltipEnterTimer = setTimeout(() => {
          doEnter();
          tooltipEnterTimer = null;
        }, 80); // 總計 130 + 80 = 210ms 延遲，鏡頭平移過半接近定位，入場自然流暢
      }, 130);
    } else {
      // 首次開啟或已關閉狀態：在鏡頭開始平移後給予 180ms 延遲，待目標進入視野中心後優雅彈出
      tooltip.hidden = true;
      closingNodeId = null;
      tooltipEnterTimer = setTimeout(() => {
        doEnter();
        tooltipEnterTimer = null;
      }, 180);
    }
  }

  function closeTooltip(immediate = false) {
    hideTagPopover();
    if (sheetDismissTimer) {
      clearTimeout(sheetDismissTimer);
      sheetDismissTimer = null;
    }
    if (tooltipCloseTimer) {
      clearTimeout(tooltipCloseTimer);
      tooltipCloseTimer = null;
    }
    if (tooltipSwitchTimer) {
      clearTimeout(tooltipSwitchTimer);
      tooltipSwitchTimer = null;
    }
    if (tooltipEnterTimer) {
      clearTimeout(tooltipEnterTimer);
      tooltipEnterTimer = null;
    }

    const closingId = state.selectedId;
    state.selectedId = null;
    state.tooltipPinned = false;
    state.elementsById.forEach((element) => {
      element.classList.remove("is-selected", "is-linked-selected", "is-pressing");
    });

    // Restore focus to last active element for accessibility
    if (state.lastSelectedElement) {
      state.lastSelectedElement.focus();
    }

    if (immediate || tooltip.hidden || !tooltip.classList.contains("is-active")) {
      closingNodeId = null;
      tooltip.classList.remove("is-pinned", "is-active", "is-closing", "is-entering");
      tooltip.hidden = true;
      return;
    }

    // 播放出場消失動畫（錨定在舊節點原處消失）
    closingNodeId = closingId;
    tooltip.classList.remove("is-entering");
    tooltip.classList.add("is-closing");
    tooltipCloseTimer = setTimeout(() => {
      closingNodeId = null;
      tooltip.classList.remove("is-pinned", "is-active", "is-closing", "is-entering");
      tooltip.hidden = true;
      tooltipCloseTimer = null;
    }, 140);
  }

  function handleHover(nodeId) {
    if (state.isNavigating || state.drag?.isDragging || state.isLerping) return;
    state.hoveredId = nodeId;
    const element = state.elementsById.get(nodeId);
    element?.classList.add("is-hovered");
    // 取消懸停觸發 Tooltip，Tooltip 一律改為點擊觸發
  }

  function handleLeave(nodeId) {
    if (state.isNavigating) return;
    state.elementsById.get(nodeId)?.classList.remove("is-hovered");
    if (state.hoveredId === nodeId) state.hoveredId = null;
  }

  // --- High-Performance Search System (120ms Debounce + Set + Dirty Checking) ---
  let prevMatchedIds = new Set();
  let searchDebounceTimer = null;

  function renderSearchResults() {
    searchResults.replaceChildren();
    if (!searchInput.value.trim() || !state.matches.length) {
      searchResults.hidden = true;
      return;
    }
    searchResults.hidden = false;
    const fragment = document.createDocumentFragment();

    state.matches.slice(0, 8).forEach((node, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(index === state.resultIndex));

      const dot = document.createElement("span");
      dot.className = "search-result-dot";
      dot.style.setProperty("--result-accent", branchColor(node.branch));

      const copy = document.createElement("span");
      copy.className = "search-result-copy";

      const title = document.createElement("span");
      title.className = "search-result-title";
      title.textContent = node._nameClean || formatValue(node.name_zh);

      const meta = document.createElement("span");
      meta.className = "search-result-meta";
      meta.textContent = `${branchName(node.branch)} · ${nodeTypeName(node.node_type)}`;

      copy.append(title, meta);
      button.append(dot, copy);
      button.addEventListener("click", () => chooseSearchResult(node.id));

      if (index === state.resultIndex) {
        requestAnimationFrame(() => button.scrollIntoView({ block: "nearest" }));
      }

      fragment.append(button);
    });

    searchResults.append(fragment);
  }

  function chooseSearchResult(nodeId) {
    searchResults.hidden = true;
    const node = state.nodeById.get(nodeId);
    if (!node) return;
    showTooltip(nodeId, true);
    centerOnNode(nodeId, false);
  }

  // --- Unified Canvas Focus & Topology Highlighting Engine (DRY) ---
  function computeUpstreamTopologyPath(targetNodeIds) {
    const activePathNodeIds = new Set(targetNodeIds);
    const queue = [...targetNodeIds];
    while (queue.length > 0) {
      const currId = queue.shift();
      const currNode = state.nodeById.get(currId);
      if (currNode && currNode.incoming) {
        for (const incId of currNode.incoming) {
          if (!activePathNodeIds.has(incId)) {
            activePathNodeIds.add(incId);
            queue.push(incId);
          }
        }
      }
    }
    const activeBranches = new Set();
    activePathNodeIds.forEach((id) => {
      const n = state.nodeById.get(id);
      if (n && n.branch) activeBranches.add(Number(n.branch));
    });
    return { activePathNodeIds, activeBranches };
  }

  function applyTopologyHighlight({
    modeClass,
    matchedNodeIds,
    activePathNodeIds,
    activeBranches,
    nodeClass,
    edgeClass,
    targetNodeId = null,
  }) {
    document.body.classList.add(modeClass);

    // 標記節點樣式
    state.elementsById.forEach((element, id) => {
      const isMatched = matchedNodeIds.has(id);
      element.classList.toggle(nodeClass, isMatched);
      if (targetNodeId !== null) {
        element.classList.toggle("is-prereq-target", id === targetNodeId);
      }
    });

    // 標記分支連線高亮（利用已解析的邊緣陣列，0 次正則與距離計算！）
    state.parsedEdges.forEach((edge) => {
      const isConnected = activePathNodeIds.has(edge.startId) && activePathNodeIds.has(edge.endId);
      edge.element.classList.toggle(edgeClass, isConnected);
    });

    // 標記中央至五大初始起點的線段（只要該陣營有節點在活躍路徑中即點亮）
    scene.querySelectorAll("path.tree-center-link").forEach((linkEl) => {
      const d = linkEl.getAttribute("d") || "";
      let isBranchActive = false;
      if (d.includes("1460.00") && activeBranches.has(1)) isBranchActive = true; // 自然 (火)
      else if (d.includes("1840.00") && activeBranches.has(2)) isBranchActive = true; // 工學 (雷)
      else if (d.includes("2160.00") && activeBranches.has(3)) isBranchActive = true; // 魔法 (冰)
      else if (d.includes("1720.00") && activeBranches.has(4)) isBranchActive = true; // 秩序 (風/陰陽/迪奇)
      else if (d.includes("2280.00") && activeBranches.has(5)) isBranchActive = true; // 渾沌 (恐懼/吞噬/貪婪)

      linkEl.classList.toggle(edgeClass, isBranchActive);
    });

    // 標記中央五大分支圖示與文字（活躍陣營點亮，其餘暗化）
    scene.querySelectorAll(".tree-center [data-branch]").forEach((el) => {
      const b = Number(el.getAttribute("data-branch"));
      el.classList.toggle("is-branch-active", activeBranches.has(b));
    });
  }

  function clearTopologyHighlight({ modeClass, nodeClass, edgeClass }) {
    document.body.classList.remove(modeClass);

    state.elementsById.forEach((element) => {
      element.classList.remove(nodeClass, "is-prereq-target");
    });

    state.parsedEdges.forEach((edge) => {
      edge.element.classList.remove(edgeClass);
    });

    scene.querySelectorAll(`path.tree-center-link.${edgeClass}`).forEach((pathEl) => {
      pathEl.classList.remove(edgeClass);
    });

    // 若無其他活躍的焦點模式，則清除中央分支活躍標記
    const isAnyActive = document.body.classList.contains("has-active-filter") ||
                        document.body.classList.contains("has-search-active") ||
                        document.body.classList.contains("has-prereq-highlight");
    if (!isAnyActive) {
      scene.querySelectorAll(".tree-center [data-branch]").forEach((el) => {
        el.classList.remove("is-branch-active");
      });
    }
  }

  function applySearch(raw = "") {
    const query = typeof raw === "string" ? raw : (raw?.target?.value || "");
    const normalized = normalizeSearchString(query.trim());
    const tokens = normalized.split(/\s+/).filter(Boolean);
    state.resultIndex = tokens.length ? 0 : -1;

    state.matches = tokens.length
      ? state.nodes.filter((node) => {
          const idx = state.searchIndex.get(node.id);
          if (!idx) return (node._searchText || "").includes(normalized);
          return tokens.every((token) => idx.combined.includes(token));
        })
      : [];

    searchClear.hidden = tokens.length === 0;

    if (tokens.length === 0) {
      clearTopologyHighlight({
        modeClass: "has-search-active",
        nodeClass: "is-search-matched",
        edgeClass: "is-search-edge",
      });

      if (state.filterBranches.size > 0 || state.filterTypes.size > 0) {
        applyFilterHighlighting();
      } else {
        searchStatus.textContent = `${state.nodes.length} 個節點`;
      }
      emptyState.hidden = true;
    } else if (!state.matches.length) {
      clearTopologyHighlight({
        modeClass: "has-search-active",
        nodeClass: "is-search-matched",
        edgeClass: "is-search-edge",
      });
      searchStatus.textContent = "找不到符合節點";
      emptyState.hidden = false;
    } else {
      // 搜尋命中時，先清除前置高亮與 Tooltip，套用與篩選完全相同的畫布焦點與拓撲高亮特效 (DRY)
      if (state.activePrereqNodeIds) {
        clearPrereqHighlight(false);
      }
      closeTooltip();

      const matchedNodeIds = new Set(state.matches.map((n) => n.id));
      const { activePathNodeIds, activeBranches } = computeUpstreamTopologyPath(state.matches.map((n) => n.id));

      applyTopologyHighlight({
        modeClass: "has-search-active",
        matchedNodeIds,
        activePathNodeIds,
        activeBranches,
        nodeClass: "is-search-matched",
        edgeClass: "is-search-edge",
      });

      searchStatus.textContent = `符合 ${state.matches.length} 個節點`;
      emptyState.hidden = true;
    }
    renderSearchResults();
  }

  // --- Multi-dimensional Filtering & Highlighting System ---
  function applyFilterHighlighting() {
    const filterClearBtn = document.getElementById("filter-clear-btn");
    const hasBranchFilter = state.filterBranches.size > 0;
    const hasTypeFilter = state.filterTypes.size > 0;
    const hasAnyFilter = hasBranchFilter || hasTypeFilter;

    if (filterClearBtn) {
      filterClearBtn.hidden = !hasAnyFilter;
    }

    if (!hasAnyFilter) {
      clearTopologyHighlight({
        modeClass: "has-active-filter",
        nodeClass: "is-filter-matched",
        edgeClass: "is-filter-edge",
      });
      if (!searchInput.value.trim()) {
        searchStatus.textContent = `${state.nodes.length} 個節點`;
      }
      return;
    }

    let matchedCount = 0;
    const matchedNodeIds = [];

    state.nodes.forEach((node) => {
      const matchBranch = !hasBranchFilter || state.filterBranches.has(Number(node.branch));
      const matchType = !hasTypeFilter || state.filterTypes.has(node.node_type);
      const isMatched = matchBranch && matchType;

      if (isMatched) {
        matchedNodeIds.push(node.id);
        matchedCount++;
      }
    });

    const { activePathNodeIds, activeBranches } = computeUpstreamTopologyPath(matchedNodeIds);

    applyTopologyHighlight({
      modeClass: "has-active-filter",
      matchedNodeIds: new Set(matchedNodeIds),
      activePathNodeIds,
      activeBranches,
      nodeClass: "is-filter-matched",
      edgeClass: "is-filter-edge",
    });

    searchStatus.textContent = `已篩選 ${matchedCount} 個節點`;
  }

  function onSearchKeydown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!state.matches.length) return;
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      state.resultIndex = (state.resultIndex + direction + state.matches.length) % state.matches.length;
      renderSearchResults();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const node = state.matches[state.resultIndex];
      if (node) chooseSearchResult(node.id);
      return;
    }
    if (event.key === "Escape") {
      searchResults.hidden = true;
    }
  }

  // --- Pointer & Touch State Machine with RAF Batching ---
  const DRAG_THRESHOLD = 8;
  let renderRafPending = false;

  function pointerDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pointerCenter(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function scheduleRenderBatch() {
    if (!renderRafPending) {
      renderRafPending = true;
      requestAnimationFrame(() => {
        renderRafPending = false;
        applySceneTransform();
        updateMinimapWindow();
      });
    }
  }

  function startPinch() {
    const points = [...state.pointers.values()];
    if (points.length !== 2) return;
    const [a, b] = points;
    const center = pointerCenter(a, b);
    const initialDistance = Math.max(10, pointerDistance(a, b));

    setZooming(true);
    setNavigating(true);
    state.pinch = {
      initialDistance,
      initialScale: state.targetScale,
      mapX: (center.x - state.targetPanX) / state.targetScale,
      mapY: (center.y - state.targetPanY) / state.targetScale,
    };
    state.drag = null;
    state.justPinched = true;
    viewport.classList.remove("is-dragging");
  }

  function startInertiaPan(initialVx, initialVy) {
    stopInertiaPan();
    state.isInertia = true;
    setNavigating(true);

    let vx = initialVx;
    let vy = initialVy;
    let lastTime = performance.now();

    function inertiaStep(now) {
      const dt = Math.min(32, Math.max(8, now - lastTime));
      lastTime = now;

      // 位置增量
      state.panX += vx * dt;
      state.panY += vy * dt;
      state.targetPanX = state.panX;
      state.targetPanY = state.panY;

      // 邊界阻尼約束
      const { minPanX, maxPanX, minPanY, maxPanY } = getPanBounds(state.scale);
      let outOfBounds = false;

      if (state.panX < minPanX) {
        state.panX += (minPanX - state.panX) * 0.16;
        vx *= 0.65;
        outOfBounds = true;
      } else if (state.panX > maxPanX) {
        state.panX += (maxPanX - state.panX) * 0.16;
        vx *= 0.65;
        outOfBounds = true;
      }

      if (state.panY < minPanY) {
        state.panY += (minPanY - state.panY) * 0.16;
        vy *= 0.65;
        outOfBounds = true;
      } else if (state.panY > maxPanY) {
        state.panY += (maxPanY - state.panY) * 0.16;
        vy *= 0.65;
        outOfBounds = true;
      }

      // 自然空氣摩擦阻尼（decay 0.94）
      const decay = outOfBounds ? 0.8 : 0.938;
      const decayFactor = Math.pow(decay, dt / 16.67);
      vx *= decayFactor;
      vy *= decayFactor;

      applySceneTransform();
      updateMinimapWindow();

      const currentSpeed = Math.hypot(vx, vy);
      if (currentSpeed < 0.018 && !outOfBounds) {
        clampTargetPan();
        state.panX = state.targetPanX;
        state.panY = state.targetPanY;
        applySceneTransform();
        updateMinimapWindow();
        stopInertiaPan();
        setNavigating(false);
      } else {
        inertiaRafId = requestAnimationFrame(inertiaStep);
      }
    }

    inertiaRafId = requestAnimationFrame(inertiaStep);
  }

  function onViewportPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.pointerType === "pen" && event.button !== 0 && event.button !== -1) return;

    // 手指/滑鼠按下，立即中斷自動相機平移動畫與慣性滑行，無縫由使用者掌控
    stopAllAnimations();

    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (state.pointers.size === 2) {
      startPinch();
      event.preventDefault();
      return;
    }

    if (state.pointers.size === 1) {
      state.pointerSamples = [{ x: event.clientX, y: event.clientY, time: performance.now() }];
      state.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: performance.now(),
        initialPanX: state.targetPanX,
        initialPanY: state.targetPanY,
        isDragging: false,
      };
    }
  }

  function onViewportPointerMove(event) {
    if (!state.pointers.has(event.pointerId)) return;
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // 2-finger pinch zoom with unified RAF batching (Zero Layout Thrashing)
    if (state.pointers.size === 2 && state.pinch) {
      setZooming(true);
      setNavigating(true);
      state.drag = null; // 縮放時鎖定純縮放，避免誤觸發平移
      state.pointerSamples = []; // 雙指縮放期間嚴格清空單指滑動速度採樣
      const points = [...state.pointers.values()];
      const [a, b] = points;
      const distance = Math.max(10, pointerDistance(a, b));
      const center = pointerCenter(a, b);

      const minS = getMinScale();
      const maxS = getMaxScale();
      const scaleRatio = distance / state.pinch.initialDistance;
      const nextScale = Math.min(maxS, Math.max(minS, state.pinch.initialScale * scaleRatio));

      state.scale = nextScale;
      state.targetScale = nextScale;
      state.panX = center.x - state.pinch.mapX * nextScale;
      state.panY = center.y - state.pinch.mapY * nextScale;
      state.targetPanX = state.panX;
      state.targetPanY = state.panY;

      zoomReadout.textContent = formatZoomPercent(state.scale);
      scheduleRenderBatch();
      event.preventDefault();
      return;
    }

    // 1-finger canvas drag with unified RAF Batching
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    const now = performance.now();
    if (!state.pointerSamples) state.pointerSamples = [];
    state.pointerSamples.push({ x: event.clientX, y: event.clientY, time: now });
    while (state.pointerSamples.length > 2 && now - state.pointerSamples[0].time > 85) {
      state.pointerSamples.shift();
    }

    const dx = event.clientX - state.drag.startX;
    const dy = event.clientY - state.drag.startY;
    const dist = Math.hypot(dx, dy);

    if (!state.drag.isDragging && dist >= DRAG_THRESHOLD) {
      state.drag.isDragging = true;
      setNavigating(true);
      viewport.classList.add("is-dragging");
      interactionStatus.textContent = "拖曳平移中";
    }

    if (state.drag.isDragging) {
      setNavigating(true);
      const rawPanX = state.drag.initialPanX + dx;
      const rawPanY = state.drag.initialPanY + dy;
      const { minPanX, maxPanX, minPanY, maxPanY } = getPanBounds(state.scale);

      // 套用高阻力彈性拉伸演算法
      state.panX = applyResistance(rawPanX, minPanX, maxPanX, 0.25);
      state.panY = applyResistance(rawPanY, minPanY, maxPanY, 0.25);
      state.targetPanX = state.panX;
      state.targetPanY = state.panY;

      scheduleRenderBatch();
      event.preventDefault();
    }
  }

  function onViewportPointerUp(event) {
    state.pointers.delete(event.pointerId);

    // 若剛才處於雙指縮放模式，任一手指離開立即結束 Pinch，且嚴格清空拖曳與速度採樣（絕不繼承慣性滑行！）
    if (state.pinch) {
      state.pinch = null;
      state.drag = null;
      state.pointerSamples = [];
      state.justPinched = true;
      window.setTimeout(() => {
        state.justPinched = false;
      }, 300);

      clampTargetPan();
      setTransform({ immediate: false });
      viewport.classList.remove("is-dragging");
      setNavigating(false, true);
      return;
    }

    if (!state.pointers.size) {
      const moved = state.drag?.isDragging && !state.justPinched;

      if (moved) {
        // 計算釋放瞬間的單指滑動速度向量 (Velocity)
        const samples = state.pointerSamples || [];
        let vx = 0;
        let vy = 0;
        if (samples.length >= 2) {
          const first = samples[0];
          const last = samples[samples.length - 1];
          const dt = Math.max(10, last.time - first.time);
          vx = (last.x - first.x) / dt;
          vy = (last.y - first.y) / dt;
        }

        const speed = Math.hypot(vx, vy);
        const maxInitialSpeed = 1.8;
        if (speed > maxInitialSpeed) {
          vx = (vx / speed) * maxInitialSpeed;
          vy = (vy / speed) * maxInitialSpeed;
        }

        const { minPanX, maxPanX, minPanY, maxPanY } = getPanBounds(state.scale);
        const isWithinBounds = (
          state.panX >= minPanX && state.panX <= maxPanX &&
          state.panY >= minPanY && state.panY <= maxPanY
        );

        if (speed >= 0.08 && isWithinBounds) {
          // 略帶慣性的持續滑動移動
          startInertiaPan(vx, vy);
        } else {
          // 若處於邊界外則平滑回彈
          clampTargetPan();
          setTransform({ immediate: false });
          if (isWithinBounds) {
            setNavigating(false, true);
          }
        }

        state.justDragged = true;
        window.setTimeout(() => {
          state.justDragged = false;
        }, 120);
      } else {
        clampTargetPan();
        setTransform({ immediate: false });
        setNavigating(false, true);
      }
      state.drag = null;
      state.pointerSamples = [];
      viewport.classList.remove("is-dragging");
    }
  }

  function onWindowBlur() {
    state.pointers.clear();
    state.drag = null;
    state.pinch = null;
    stopInertiaPan();
    stopSmoothWheelZoom();
    viewport.classList.remove("is-dragging");
    setNavigating(false, true);
  }

  function onViewportWheel(event) {
    event.preventDefault();
    setZooming(true);
    setNavigating(true);
    state.drag = null;

    const { width, height } = viewportSize();
    const cx = width / 2;
    const cy = height / 2;

    // 縮放始終嚴格以「目前畫面正中央 (Viewport Center)」為基準中心錨點
    if (targetWheelScale === null || wheelAnchorWorldX === null) {
      targetWheelScale = state.scale;
      wheelAnchorWorldX = (cx - state.panX) / state.scale;
      wheelAnchorWorldY = (cy - state.panY) / state.scale;
    }

    // 快速滾動時以乘數連續複合累計，滾動越快縮放響應越迅速
    const minS = getMinScale();
    const maxS = getMaxScale();
    const zoomMultiplier = Math.exp(-event.deltaY * 0.0018);
    targetWheelScale = Math.min(maxS, Math.max(minS, targetWheelScale * zoomMultiplier));

    if (!wheelZoomRafId) {
      function smoothWheelZoomStep() {
        const diff = targetWheelScale - state.scale;
        
        if (Math.abs(diff) < 0.001) {
          state.scale = targetWheelScale;
          state.targetScale = targetWheelScale;
          state.panX = cx - wheelAnchorWorldX * state.scale;
          state.panY = cy - wheelAnchorWorldY * state.scale;
          state.targetPanX = state.panX;
          state.targetPanY = state.panY;
          applySceneTransform();
          updateMinimapWindow();
          zoomReadout.textContent = formatZoomPercent(state.scale);

          stopSmoothWheelZoom();
          setZooming(false);
          setNavigating(false, true);
          return;
        }

        // 高響應性阻尼追趕（每幀 32% 迅速收斂，絲滑無遲滯）
        state.scale += diff * 0.32;
        state.targetScale = state.scale;
        state.panX = cx - wheelAnchorWorldX * state.scale;
        state.panY = cy - wheelAnchorWorldY * state.scale;
        state.targetPanX = state.panX;
        state.targetPanY = state.panY;

        applySceneTransform();
        updateMinimapWindow();
        zoomReadout.textContent = formatZoomPercent(state.scale);

        wheelZoomRafId = requestAnimationFrame(smoothWheelZoomStep);
      }

      wheelZoomRafId = requestAnimationFrame(smoothWheelZoomStep);
    }
  }

  function centerOnNode(nodeId, immediate = false) {
    const pt = state.nodePositions.get(nodeId);
    if (!pt) return;
    const { width, height } = viewportSize();
    // 純相機平移：使用當前 scale，絕不改變使用者自選縮放等級
    const currentScale = state.scale;
    const targetX = width / 2 - pt.x * currentScale;
    const targetY = height / 2 - pt.y * currentScale;
    startCameraPan(targetX, targetY, immediate);
  }

  // 邏輯 A：一般模式相機移動（節點水平居中，直向定位使始終位於正上方的 Tooltip 幾何中心精準位於視窗垂直正中央）
  function centerOnNodeForTooltip(nodeId, immediate = false) {
    const pt = state.nodePositions.get(nodeId);
    if (!pt) return;
    const { width, height } = viewportSize();
    
    // 純相機平移：使用當前 scale，絕不干擾縮放
    const currentScale = state.scale;

    // 橫向水平正中央
    const targetX = width / 2 - pt.x * currentScale;

    // 直向定位：使節點位於下方，使 Tooltip 始終在節點正上方且居中
    const tipHeight = tooltip.offsetHeight || cachedTipHeight || 320;
    const node = state.nodeById.get(nodeId);
    const isLarge = node?.node_type === "DICE" || node?.node_type === "PERK";
    const nodeRadius = (isLarge ? 52 : 36) * currentScale;
    const gap = window.innerWidth <= 768 ? 16 : 14;
    const upwardShift = window.innerWidth <= 768 ? 28 : 0; // 手機端略為上移 28px
    
    const targetNodeScreenY = height / 2 + nodeRadius + tipHeight / 2 + gap + upwardShift;
    const targetY = targetNodeScreenY - pt.y * currentScale;
    startCameraPan(targetX, targetY, immediate);
  }

  // --- Wire SVG Nodes & Controls ---
  function wireNodes() {
    scene.querySelectorAll("g.node[data-node-id]").forEach((element) => {
      const nodeId = element.dataset.nodeId;
      const node = state.nodeById.get(nodeId);
      state.elementsById.set(nodeId, element);

      // 直接精準解析 SVG transform 屬性中的 translate(x, y) 絕對世界座標
      const transform = element.getAttribute("transform");
      const match = /translate\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/.exec(transform || "");
      if (match) {
        state.nodePositions.set(nodeId, {
          x: parseFloat(match[1]),
          y: parseFloat(match[2]),
        });
      } else if (node && typeof node.x === "number" && typeof node.y === "number") {
        state.nodePositions.set(nodeId, { x: 2000 + node.x, y: 1700 + node.y });
      }

      // 注入遊戲原版高科技選取光框圖層（掛載於 scale 容器，精準適配五大派系色彩與各類節點真實外框）
      const branch = node?.branch || 1;
      const colors = FACTION_SELECTION_COLORS[branch] || FACTION_SELECTION_COLORS[1];
      element.style.setProperty("--node-hover-color", colors.base);
      element.style.setProperty("--node-hover-runner", colors.runner);

      if (!element.querySelector(".node-selection-layer")) {
        const nType = node?.node_type;
        const isBig = Boolean(node?.is_big || element.querySelector("use[href*='sprite-187']"));

        // 尋找 scale 容器（節點的本機座標空間容器）
        const scaleContainer = element.querySelector("g[transform^='scale']") || element;

        const gSel = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gSel.setAttribute("class", "node-selection-layer");
        gSel.setAttribute("pointer-events", "none");

        if (nType === "DICE") {
          // 骰子：底框為 134x140 rx=16，略大一圈緊貼底框外緣（136x142 rx=17）
          const x = -68;
          const y = -71;
          const w = 136;
          const h = 142;
          const rx = 17;
          const p = 2 * (w + h) - 8 * rx + 2 * Math.PI * rx;
          const dashL = 80; // 短條加長兩倍
          const dashGap = Math.round(p / 2 - dashL);

          gSel.innerHTML = `
            <rect class="sel-box-base" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="none" stroke="${colors.base}" />
            <rect class="sel-box-runner" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="none" stroke="${colors.runner}" style="stroke-dasharray: ${dashL} ${dashGap} ${dashL} ${dashGap}; stroke-dashoffset: 0; --path-len: ${Math.round(p)}; animation: selRunnerSpin 2.4s linear infinite;" />
          `;
        } else if (isBig) {
          // 大型節點：純白 #FFFFFF 圓角稜形外框（100x100，rx=21，旋轉 45 度），無跑馬燈
          gSel.innerHTML = `
            <rect class="sel-box-base" x="-50" y="-50" width="100" height="100" rx="21" ry="21" transform="rotate(45)" fill="none" stroke="#FFFFFF" />
          `;
        } else if (nType === "PERK") {
          // 輔助特性：底框為 136x76 rx=14，略大一圈緊貼外緣（138x78 rx=15）
          const x = -69;
          const y = -39;
          const w = 138;
          const h = 78;
          const rx = 15;
          const p = 2 * (w + h) - 8 * rx + 2 * Math.PI * rx;
          const dashL = 65; // 加長兩倍
          const dashGap = Math.round(p / 2 - dashL);

          gSel.innerHTML = `
            <rect class="sel-box-base" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="none" stroke="${colors.base}" />
            <rect class="sel-box-runner" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="none" stroke="${colors.runner}" style="stroke-dasharray: ${dashL} ${dashGap} ${dashL} ${dashGap}; stroke-dashoffset: 0; --path-len: ${Math.round(p)}; animation: selRunnerSpin 2.4s linear infinite;" />
          `;
        } else if (nType === "DICE_RUNE") {
          // 骰子符文：在 scale(0.56) 空間下，略為收窄緊貼淡紫色圓形底座外緣（cx=0, cy=4, r=42.5）
          const r = 42.5;
          const cy = 4;
          const p = 2 * Math.PI * r;
          const dashL = 45; // 加長兩倍
          const dashGap = Math.round(p / 2 - dashL);

          gSel.innerHTML = `
            <circle class="sel-box-base" cx="0" cy="${cy}" r="${r}" fill="none" stroke="${colors.base}" />
            <circle class="sel-box-runner" cx="0" cy="${cy}" r="${r}" fill="none" stroke="${colors.runner}" style="stroke-dasharray: ${dashL} ${dashGap} ${dashL} ${dashGap}; stroke-dashoffset: 0; --path-len: ${Math.round(p)}; animation: selRunnerSpin 2.4s linear infinite;" />
          `;
        } else {
          // 普通小型被動節點：緊貼圓形徽章底框外緣（r=47）
          const r = 47;
          const p = 2 * Math.PI * r;
          const dashL = 50; // 加長兩倍
          const dashGap = Math.round(p / 2 - dashL);

          gSel.innerHTML = `
            <circle class="sel-box-base" cx="0" cy="0" r="${r}" fill="none" stroke="${colors.base}" />
            <circle class="sel-box-runner" cx="0" cy="0" r="${r}" fill="none" stroke="${colors.runner}" style="stroke-dasharray: ${dashL} ${dashGap} ${dashL} ${dashGap}; stroke-dashoffset: 0; --path-len: ${Math.round(p)}; animation: selRunnerSpin 2.4s linear infinite;" />
          `;
        }

        // 精準置於「底框」與「圖示」之間的圖層
        const nodeBody = element.querySelector(".node-body");
        if (nodeBody) {
          let insertTarget = null;
          if (nType === "DICE" || nType === "PERK") {
            // 骰子與特性：底框為前置 rect，圖示為後續 use/image
            insertTarget = nodeBody.querySelector("use, image, .dice-shadow");
          } else if (isBig || nType === "PLAYER_PASSIVE") {
            // 大小被動：第一個子元素是 #sprite-187 或 #sprite-188 底框，選取框插入於底框之後、圖示之前
            const firstChild = nodeBody.firstElementChild;
            if (firstChild && firstChild.nextElementSibling) {
              insertTarget = firstChild.nextElementSibling;
            }
          }

          if (insertTarget) {
            nodeBody.insertBefore(gSel, insertTarget);
          } else {
            nodeBody.appendChild(gSel);
          }

          // 針對符文節點：頂部圓盤覆蓋在選取框上方（產生頂部遮擋關係），下半部不遮罩讓光線自然發散
          if (nType === "DICE_RUNE") {
            const svgRoot = element.ownerSVGElement || document.querySelector("#tree-svg-container svg");
            if (svgRoot && !svgRoot.querySelector("#rune-cylinder-clip")) {
              let defs = svgRoot.querySelector("defs");
              if (!defs) {
                defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                svgRoot.insertBefore(defs, svgRoot.firstChild);
              }
              const clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
              clip.setAttribute("id", "rune-cylinder-clip");
              clip.innerHTML = `<circle cx="0" cy="-10" r="39.5" />`;
              defs.appendChild(clip);
            }

            const origIcon = nodeBody.querySelector("use.node-icon:not(.node-icon-overlay)");
            if (origIcon && !nodeBody.querySelector(".node-icon-overlay-group")) {
              const gOverlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
              gOverlay.setAttribute("class", "node-icon-overlay-group");
              gOverlay.setAttribute("clip-path", "url(#rune-cylinder-clip)");
              gOverlay.setAttribute("pointer-events", "none");

              const overlay = origIcon.cloneNode(true);
              overlay.setAttribute("class", "node-icon node-icon-overlay");
              gOverlay.appendChild(overlay);
              nodeBody.appendChild(gOverlay);
            }
          }
        } else {
          scaleContainer.appendChild(gSel);
        }
      }

      // 特殊骰子「查看貨幣」標籤文字替換（合作 2100、通行證 300、七日旅程 700、合作 900）
      const specialBadgeLabel = {
        "5006": "合作 2100",
        "5008": "通行證 300",
        "4008": "七日旅程 700",
        "5002": "合作 900",
      }[nodeId];

      if (specialBadgeLabel) {
        const costBadge = element.querySelector(".cost-badge");
        if (costBadge) {
          costBadge.classList.add("is-special-cost-badge");
          const icon = costBadge.querySelector("use, image");
          if (icon) icon.remove();

          const badgeWidth = Math.max(76, specialBadgeLabel.length * 14 + 18);
          const leftX = -badgeWidth / 2;
          const rects = costBadge.querySelectorAll("rect");
          if (rects[0]) {
            rects[0].setAttribute("x", String(leftX));
            rects[0].setAttribute("width", String(badgeWidth));
          }
          if (rects[1]) {
            rects[1].setAttribute("x", String(leftX + 1.5));
            rects[1].setAttribute("width", String(badgeWidth - 3));
          }

          const valText = costBadge.querySelector(".cost-value");
          if (valText) {
            valText.classList.add("is-special-cost-text");
            valText.setAttribute("x", "0");
            valText.setAttribute("text-anchor", "middle");
            valText.style.setProperty("text-anchor", "middle", "important");
            valText.textContent = specialBadgeLabel;
            valText.style.fill = "#ffd859";
            valText.style.fontWeight = "800";
          }
        }
      }

      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
      element.setAttribute(
        "aria-label",
        `${node?._nameClean || formatValue(node?.name_zh, "節點")}，${nodeTypeName(node?.node_type)}`
      );

      element.addEventListener("pointerenter", () => handleHover(nodeId));
      element.addEventListener("pointerleave", () => {
        handleLeave(nodeId);
        element.classList.remove("is-pressing");
      });

      // 點擊按壓物理動態反饋
      element.addEventListener("pointerdown", () => element.classList.add("is-pressing"));
      const endNodePress = () => element.classList.remove("is-pressing");
      element.addEventListener("pointerup", endNodePress);
      element.addEventListener("pointercancel", endNodePress);

      element.addEventListener("click", (event) => {
        event.stopPropagation();
        if (state.drag?.isDragging || state.justDragged || state.justPinched) {
          event.preventDefault();
          return;
        }

        const isAlreadySelected = (
          state.selectedId === nodeId &&
          !tooltip.hidden &&
          tooltip.classList.contains("is-active")
        );

        state.lastSelectedElement = element;
        showTooltip(nodeId, true);

        if (isAlreadySelected) {
          // 重複點擊已選取節點：按壓回饋保留，但不打斷視角動畫或重置前置路徑
          return;
        }

        if (state.isLerping) {
          state.isLerping = false;
          setNavigating(false, true);
        }
        
        // 若處於前置節點高亮模式，自動標示前置路徑
        if (state.showPrereqMode) {
          showPrerequisitePath(nodeId);
        }
        
        // 相機移動邏輯一律與常規相同（節點居中偏下、Tooltip 居中）
        centerOnNodeForTooltip(nodeId, false);
      });

      element.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();

        const isAlreadySelected = (
          state.selectedId === nodeId &&
          !tooltip.hidden &&
          tooltip.classList.contains("is-active")
        );

        state.lastSelectedElement = element;
        showTooltip(nodeId, true);

        if (isAlreadySelected) return;
        
        if (state.showPrereqMode) {
          showPrerequisitePath(nodeId);
        }
        
        centerOnNodeForTooltip(nodeId, false);
      });
    });

    // 為中央 5 個分支標籤元素打上 data-branch
    const treeCenter = scene.querySelector(".tree-center");
    if (treeCenter) {
      const branchMap = [
        { branch: 1, x: 2000 },
        { branch: 2, x: 1914 },
        { branch: 3, x: 2098 },
        { branch: 4, x: 1832 },
        { branch: 5, x: 2168 },
      ];
      branchMap.forEach(({ branch, x }) => {
        const mark = treeCenter.querySelector(`.tree-center-stat-mark-${branch}`);
        if (mark) mark.setAttribute("data-branch", String(branch));
        const texts = treeCenter.querySelectorAll(`text.tree-center-stat-name[x^="${x}"], text.tree-center-stat-value[x^="${x}"]`);
        texts.forEach((t) => t.setAttribute("data-branch", String(branch)));
      });
    }
  }

  // --- Graph Pre-indexing & Prerequisite Graph Pre-computation (加載期預算) ---
  function preindexEdges() {
    state.parsedEdges = [];
    const edgePaths = scene.querySelectorAll("path.edge");
    edgePaths.forEach((pathEl) => {
      const d = pathEl.getAttribute("d") || "";
      const match = /M\s+([\d.-]+)\s+([\d.-]+)\s+L\s+([\d.-]+)\s+([\d.-]+)/.exec(d);
      if (!match) return;
      const x1 = parseFloat(match[1]), y1 = parseFloat(match[2]);
      const x2 = parseFloat(match[3]), y2 = parseFloat(match[4]);
      let startNodeId = null;
      let endNodeId = null;
      for (const [id, pt] of state.nodePositions) {
        if (!startNodeId && Math.hypot(pt.x - x1, pt.y - y1) < 14) startNodeId = id;
        if (!endNodeId && Math.hypot(pt.x - x2, pt.y - y2) < 14) endNodeId = id;
        if (startNodeId && endNodeId) break;
      }
      if (startNodeId && endNodeId) {
        state.parsedEdges.push({
          element: pathEl,
          startId: startNodeId,
          endId: endNodeId,
        });
      }
    });
  }

  function precomputePrerequisiteGraph() {
    state.prereqGraph.clear();
    state.nodes.forEach((targetNode) => {
      const prereqNodeIds = new Set([targetNode.id]);
      const queue = [targetNode.id];
      while (queue.length > 0) {
        const currentId = queue.shift();
        const currNode = state.nodeById.get(currentId);
        if (!currNode) continue;
        const incs = currNode.incoming || [];
        for (const incId of incs) {
          if (!prereqNodeIds.has(incId)) {
            prereqNodeIds.add(incId);
            queue.push(incId);
          }
        }
      }

      const prereqBranches = new Set();
      prereqNodeIds.forEach((id) => {
        const n = state.nodeById.get(id);
        if (n && n.branch) prereqBranches.add(Number(n.branch));
      });

      state.prereqGraph.set(targetNode.id, {
        nodeIds: prereqNodeIds,
        branches: prereqBranches,
      });
    });
  }

  // --- 加載期深度預熱：搜尋倒排索引與分詞預構建 ---
  function prebuildSearchIndex() {
    state.searchIndex.clear();
    state.nodes.forEach((node) => {
      const name = normalizeSearchString(node._nameClean || node.name_zh || "");
      const dice = normalizeSearchString(node.dice_type || node.rune_dice || "");
      const branch = normalizeSearchString(node.branch_zh || "");
      const type = normalizeSearchString(node.node_type_zh || "");
      const desc = normalizeSearchString(node._descClean || "");
      const awaken = normalizeSearchString(node._awakenClean || "");
      const rawCombined = `${name} ${dice} ${branch} ${type} ${desc} ${awaken} ${node.id}`;
      const tokens = new Set(rawCombined.split(/\s+/).filter(Boolean));
      state.searchIndex.set(node.id, {
        name,
        dice,
        branch,
        type,
        desc,
        combined: rawCombined,
        tokens,
      });
    });
  }

  // --- 加載期深度預熱：節點幾何座標、派系群心與 DOM 分組 Set 預計算 ---
  function precomputeGeometryAndGroups() {
    state.branchNodesMap.clear();
    state.typeNodesMap.clear();
    state.nodeGeometryMap.clear();
    state.branchCentroids.clear();

    for (let b = 1; b <= 5; b++) {
      state.branchNodesMap.set(b, new Set());
    }
    ["DICE", "DICE_RUNE", "PLAYER_PASSIVE", "PERK"].forEach((typeKey) => {
      state.typeNodesMap.set(typeKey, new Set());
    });

    const branchTotals = new Map();

    state.nodes.forEach((node) => {
      const el = state.elementsById.get(node.id);
      const bId = Number(node.branch);
      const tKey = node.node_type;

      if (el) {
        state.branchNodesMap.get(bId)?.add(el);
        state.typeNodesMap.get(tKey)?.add(el);
      }

      const pt = state.nodePositions.get(node.id);
      if (pt) {
        const isLarge = tKey === "DICE" || tKey === "PERK";
        state.nodeGeometryMap.set(node.id, {
          cx: pt.x,
          cy: pt.y,
          isLarge,
          radius: isLarge ? 52 : 36,
          branch: bId,
          type: tKey,
        });

        if (!branchTotals.has(bId)) {
          branchTotals.set(bId, { sumX: 0, sumY: 0, count: 0 });
        }
        const bTot = branchTotals.get(bId);
        bTot.sumX += pt.x;
        bTot.sumY += pt.y;
        bTot.count += 1;
      }
    });

    branchTotals.forEach((tot, bId) => {
      if (tot.count > 0) {
        state.branchCentroids.set(bId, {
          cx: tot.sumX / tot.count,
          cy: tot.sumY / tot.count,
        });
      }
    });
  }

  // --- 加載期深度預熱：小地圖離屏點陣底圖預烘焙 (Pre-baking Offscreen Canvas) ---
  function prebakeMinimap() {
    if (!minimapCanvas || !state.nodes.length) return;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const scaleX = w / MAP_WIDTH;
    const scaleY = h / MAP_HEIGHT;

    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = w;
    baseCanvas.height = h;
    const ctx = baseCanvas.getContext("2d");

    ctx.fillStyle = "#0b0d13";
    ctx.fillRect(0, 0, w, h);

    // 1. Batch Draw Connecting Lines (1 Draw Call for all edges)
    ctx.beginPath();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    state.nodes.forEach((node) => {
      const p1 = nodePoint(node.id);
      if (!p1) return;
      (node.next_nodes || []).forEach((nextId) => {
        const p2 = nodePoint(nextId);
        if (!p2) return;
        ctx.moveTo(p1.x * scaleX, p1.y * scaleY);
        ctx.lineTo(p2.x * scaleX, p2.y * scaleY);
      });
    });
    ctx.stroke();

    // 2. Batch Draw Node Dots by Faction
    const factionBuckets = new Map();
    for (let f = 1; f <= 5; f++) {
      factionBuckets.set(f, { dice: [], regular: [] });
    }

    state.nodes.forEach((node) => {
      const p = nodePoint(node.id);
      if (!p) return;
      const bucket = factionBuckets.get(Number(node.branch)) || factionBuckets.get(1);
      const isLarge = node.is_base || node.node_type === "DICE";
      if (isLarge) {
        bucket.dice.push({ x: p.x * scaleX, y: p.y * scaleY });
      } else {
        bucket.regular.push({ x: p.x * scaleX, y: p.y * scaleY });
      }
    });

    factionBuckets.forEach((bucket, branchId) => {
      const color = branchColor(branchId);
      if (bucket.regular.length > 0) {
        ctx.beginPath();
        bucket.regular.forEach(({ x, y }) => {
          ctx.moveTo(x + 2, y);
          ctx.arc(x, y, 2.0, 0, Math.PI * 2);
        });
        ctx.fillStyle = color;
        ctx.fill();
      }

      if (bucket.dice.length > 0) {
        ctx.beginPath();
        bucket.dice.forEach(({ x, y }) => {
          ctx.moveTo(x + 3.8, y);
          ctx.arc(x, y, 3.8, 0, Math.PI * 2);
        });
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.beginPath();
        bucket.dice.forEach(({ x, y }) => {
          ctx.moveTo(x + 2.6, y);
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        });
        ctx.fillStyle = color;
        ctx.fill();
      }
    });

    state.minimapBaseCanvas = baseCanvas;
  }

  // --- Prerequisite Path Highlighting & Traversal System (O(1) 瞬發查詢, DRY) ---
  function showPrerequisitePath(targetNodeId) {
    let prereq = state.prereqGraph.get(targetNodeId);
    if (!prereq) {
      const targetNode = state.nodeById.get(targetNodeId);
      if (!targetNode) return;
      const { activePathNodeIds, activeBranches } = computeUpstreamTopologyPath([targetNodeId]);
      prereq = { nodeIds: activePathNodeIds, branches: activeBranches };
      state.prereqGraph.set(targetNodeId, prereq);
    }

    const { nodeIds: prereqNodeIds, branches: prereqBranches } = prereq;
    state.activePrereqNodeIds = prereqNodeIds;
    state.activePrereqTargetId = targetNodeId;

    applyTopologyHighlight({
      modeClass: "has-prereq-highlight",
      matchedNodeIds: prereqNodeIds,
      activePathNodeIds: prereqNodeIds,
      activeBranches: prereqBranches,
      nodeClass: "is-prereq-active",
      edgeClass: "is-prereq-edge",
      targetNodeId,
    });
  }

  function clearPrereqHighlight(resetButtonState = false) {
    state.activePrereqNodeIds = null;
    state.activePrereqTargetId = null;

    clearTopologyHighlight({
      modeClass: "has-prereq-highlight",
      nodeClass: "is-prereq-active",
      edgeClass: "is-prereq-edge",
    });

    if (resetButtonState) {
      state.showPrereqMode = false;
      const togglePrereqBtn = $("#toggle-prereq-btn");
      if (togglePrereqBtn) {
        togglePrereqBtn.classList.remove("is-active");
        togglePrereqBtn.setAttribute("aria-pressed", "false");
      }
    }
  }

  // 邏輯 B：前置路徑智能適應相機聚焦
  function centerOnPrereqPath(nodeIds, targetNodeId = null, immediate = false) {
    if (!nodeIds || !nodeIds.size) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodeIds.forEach((id) => {
      const pt = state.nodePositions.get(id);
      if (pt) {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      }
    });

    if (!isFinite(minX)) return;

    const { width, height } = viewportSize();
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const pathWidth = maxX - minX + 240;
    const pathHeight = maxY - minY + 240;

    const fitScale = Math.min(1.1, Math.max(MIN_SCALE, Math.min((width - 80) / pathWidth, (height - 120) / pathHeight)));

    if (immediate) {
      state.scale = fitScale;
      state.targetScale = fitScale;
      state.panX = width / 2 - centerX * fitScale;
      state.panY = height / 2 - centerY * fitScale;
      state.targetPanX = state.panX;
      state.targetPanY = state.panY;
      applySceneTransform();
      updateMinimapWindow();
      zoomReadout.textContent = `${Math.round(state.scale * 100)}%`;
    } else {
      startCameraZoom(fitScale, centerX, centerY, false);
    }
  }

  function connectControls() {
    $("#zoom-in").addEventListener("click", () => setZoom(state.targetScale * 1.25, false));
    $("#zoom-out").addEventListener("click", () => setZoom(state.targetScale / 1.25, false));
    $("#zoom-reset").addEventListener("click", () => resetToCenter(false));
    $("#zoom-fit").addEventListener("click", () => fitToViewport(false));

    // 查看前置節點常駐開關
    const togglePrereqBtn = $("#toggle-prereq-btn");
    togglePrereqBtn?.addEventListener("click", () => {
      state.showPrereqMode = !state.showPrereqMode;
      togglePrereqBtn.classList.toggle("is-active", state.showPrereqMode);
      togglePrereqBtn.setAttribute("aria-pressed", String(state.showPrereqMode));

      if (state.showPrereqMode) {
        if (state.selectedId) {
          showPrerequisitePath(state.selectedId);
          centerOnPrereqPath(state.activePrereqNodeIds);
        }
      } else {
        clearPrereqHighlight(false);
      }
    });

    // 查看貨幣標籤常駐開關
    const toggleCurrencyBtn = $("#toggle-currency-btn");
    toggleCurrencyBtn?.addEventListener("click", () => {
      state.showCurrencyBadges = !state.showCurrencyBadges;
      document.body.classList.toggle("show-currency-badges", state.showCurrencyBadges);
      toggleCurrencyBtn.classList.toggle("is-active", state.showCurrencyBadges);
      toggleCurrencyBtn.setAttribute("aria-pressed", String(state.showCurrencyBadges));
    });

    // 為 HUD 按鈕加入物理按壓反饋
    [togglePrereqBtn, toggleCurrencyBtn].forEach((btn) => {
      if (!btn) return;
      btn.addEventListener("pointerdown", () => btn.classList.add("is-pressing"));
      const removeBtnPress = () => btn.classList.remove("is-pressing");
      btn.addEventListener("pointerup", removeBtnPress);
      btn.addEventListener("pointercancel", removeBtnPress);
      btn.addEventListener("pointerleave", removeBtnPress);
    });

    tooltipClose?.addEventListener("click", closeTooltip);

    // 60ms Debounced search (極致靈敏響應)
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        applySearch(searchInput.value);
      }, 60);
    });

    searchInput.addEventListener("keydown", onSearchKeydown);
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      applySearch("");
      searchInput.focus();
    });

    // 陣營與類型篩選按鈕事件
    document.querySelectorAll(".filter-chip.branch-chip").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const branchId = Number(btn.dataset.branch);
        if (state.filterBranches.has(branchId)) {
          state.filterBranches.delete(branchId);
          btn.classList.remove("is-selected");
        } else {
          state.filterBranches.add(branchId);
          btn.classList.add("is-selected");
        }
        applyFilterHighlighting();
      });
    });

    document.querySelectorAll(".filter-chip.type-chip").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const typeKey = btn.dataset.type;
        if (state.filterTypes.has(typeKey)) {
          state.filterTypes.delete(typeKey);
          btn.classList.remove("is-selected");
        } else {
          state.filterTypes.add(typeKey);
          btn.classList.add("is-selected");
        }
        applyFilterHighlighting();
      });
    });

    const filterClearBtn = document.getElementById("filter-clear-btn");
    filterClearBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      state.filterBranches.clear();
      state.filterTypes.clear();
      document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.remove("is-selected"));
      applyFilterHighlighting();
    });

    // 手機版搜尋圓形按鈕點擊向左展開為膠囊
    const searchField = document.querySelector(".search-field");
    searchField?.addEventListener("click", (e) => {
      if (window.innerWidth <= 768 && !searchField.classList.contains("is-expanded")) {
        searchField.classList.add("is-expanded");
        searchInput.focus();
      }
    });

    // 免責聲明與著作權小工具 (Morphing Widget)
    const disclaimerWidget = document.getElementById("disclaimer-widget");
    const disclaimerToggleBtn = document.getElementById("disclaimer-toggle-btn");
    const disclaimerCloseBtn = document.getElementById("disclaimer-close-btn");
    const disclaimerCard = document.getElementById("disclaimer-card");

    function openDisclaimer() {
      if (!disclaimerWidget) return;
      disclaimerWidget.classList.add("is-expanded");
      disclaimerToggleBtn?.setAttribute("aria-expanded", "true");
      disclaimerCard?.setAttribute("aria-hidden", "false");
    }

    function closeDisclaimer() {
      if (!disclaimerWidget) return;
      disclaimerWidget.classList.remove("is-expanded");
      disclaimerToggleBtn?.setAttribute("aria-expanded", "false");
      disclaimerCard?.setAttribute("aria-hidden", "true");
    }

    function toggleDisclaimer() {
      if (disclaimerWidget?.classList.contains("is-expanded")) {
        closeDisclaimer();
      } else {
        openDisclaimer();
      }
    }

    disclaimerToggleBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDisclaimer();
    });

    disclaimerCloseBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeDisclaimer();
    });

    // 點擊空白處時收合手機端搜尋膠囊、免責聲明或標籤解釋 Popover
    window.addEventListener("click", (e) => {
      // 檢查是否點擊標籤（底線詞彙或 #標籤 晶片）
      const tagBtn = e.target.closest(".tooltip-tag-inline, .tooltip-hashtag-chip");
      if (tagBtn) {
        e.stopPropagation();
        const tagKey = tagBtn.getAttribute("data-tag-key");
        if (tagKey) showTagPopover(tagKey, tagBtn);
        return;
      }

      // 若點擊 Popover 內部則不關閉
      if (tagPopover && tagPopover.contains(e.target)) {
        return;
      }

      hideTagPopover();

      if (window.innerWidth <= 768 && searchField?.classList.contains("is-expanded")) {
        const insideSearch = Boolean(e.target.closest(".search-block"));
        if (!insideSearch && !searchInput.value.trim()) {
          searchField.classList.remove("is-expanded");
        }
      }

      if (disclaimerWidget && !disclaimerWidget.contains(e.target)) {
        closeDisclaimer();
      }
    });

    // Pointer events on Viewport & Window for uninterrupted pointer tracking
    viewport.addEventListener("pointerdown", onViewportPointerDown);
    window.addEventListener("pointermove", onViewportPointerMove, { passive: false });
    window.addEventListener("pointerup", onViewportPointerUp);
    window.addEventListener("pointercancel", onViewportPointerUp);
    window.addEventListener("blur", onWindowBlur);

    // 全局滾輪縮放（排除 Tooltip 內部文字與搜尋結果滾動，始終嚴格以畫面正中央為基準錨點）
    window.addEventListener(
      "wheel",
      (event) => {
        if (event.target.closest(".tooltip-body, .search-results, .panel-body")) return;
        onViewportWheel(event);
      },
      { passive: false }
    );

    // 點擊空白處處理（第 1 次收起選取與 Tooltip 保留前置高亮，第 2 次點擊清除前置路徑高亮）
    viewport.addEventListener("click", (event) => {
      if (state.drag?.isDragging || state.justDragged || state.justPinched) {
        return;
      }
      if (state.isLerping) {
        state.isLerping = false;
        setNavigating(false, true);
      }
      const isNode = Boolean(event.target.closest(".node"));
      const isTooltip = Boolean(event.target.closest("#tooltip"));
      const isUI = Boolean(event.target.closest(".topbar, .minimap-panel, .map-toolbar, .hud-toggle-group"));

      if (!isNode && !isTooltip && !isUI) {
        const hadSelectionOrTooltip = Boolean(state.selectedId || !tooltip.hidden);
        const hasPrereqHighlight = Boolean(state.activePrereqNodeIds && state.activePrereqNodeIds.size > 0);

        if (hadSelectionOrTooltip) {
          // 第 1 次點擊空白處：取消節點選取、收起 Tooltip，保留前置路徑高亮
          state.selectedId = null;
          state.tooltipPinned = false;
          state.lastSelectedElement = null;
          closeTooltip();
          state.elementsById.forEach((el) => {
            el.classList.remove("is-selected", "is-hovered");
          });
          interactionStatus.textContent = "";
        } else if (hasPrereqHighlight) {
          // 第 2 次點擊空白處：清除前置路徑高亮顯示
          clearPrereqHighlight(false);
          interactionStatus.textContent = "";
        }
      }
    });

    minimap.addEventListener("click", onMinimapClick);

    window.addEventListener("resize", () => {
      updateViewportSizeCache();
      clampTargetPan();
      setTransform({ immediate: true });
      if (!tooltip.hidden && state.selectedId && window.innerWidth > 768) {
        positionTooltip(state.selectedId);
      }
    });

    window.addEventListener("keydown", (event) => {
      const isInput = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (isInput && event.key !== "Escape") return;

      if (event.key === "/" && document.activeElement !== searchInput) {
        event.preventDefault();
        searchInput.focus();
      } else if (event.key === "Escape") {
        closeTooltip();
        closeDisclaimer();
        searchResults.hidden = true;
      } else if (event.key === "+" || event.key === "=") {
        setZoom(state.targetScale * 1.25, false);
      } else if (event.key === "-" || event.key === "_") {
        setZoom(state.targetScale / 1.25, false);
      } else if (event.key === "0") {
        resetToCenter(false);
      }
    });
  }

  const loadingScreen = document.getElementById("loading-screen");
  const loaderProgressFill = document.getElementById("loader-progress-fill");
  const loaderStatusLabel = document.getElementById("loader-status-label");

  function setLoaderProgress(percent, labelText) {
    if (loaderProgressFill) loaderProgressFill.style.width = `${percent}%`;
    if (loaderStatusLabel && labelText) loaderStatusLabel.textContent = labelText;
  }

  function dismissLoader() {
    if (!loadingScreen || window.__BLOCK_DISMISS_LOADER__) return;
    loadingScreen.classList.add("is-loaded");
    // 啟動四周扭曲縮放進場動效與 HUD 交錯彈入
    document.body.classList.add("app-entering");
    // 進場後讓小地圖保持亮起一段時間（延後消失），杜絕硬切
    document.body.classList.add("is-minimap-active");

    setTimeout(() => {
      loadingScreen.classList.add("is-hidden");
      loadingScreen.hidden = true;
    }, 500);

    setTimeout(() => {
      document.body.classList.remove("app-entering");
    }, 900);

    // 進場展示 2.4 秒後平滑轉交給 CSS 1600ms 延遲淡出機制
    setTimeout(() => {
      document.body.classList.remove("is-minimap-active");
    }, 2400);
  }

  async function loadMap() {
    setLoaderProgress(15, "正在載入天賦資料...");
    let data = window.TREE_DATA || window.__DICE_TREE_DATA__;
    let svgText = window.DICE_TREE_SVG || window.__DICE_TREE_SVG__;

    if (!data || !svgText) {
      try {
        setLoaderProgress(30, "讀取節點數據中...");
        const [dataResponse, svgResponse] = await Promise.all([
          !data ? fetch(DATA_URL) : Promise.resolve({ ok: true, json: () => data }),
          !svgText ? fetch(SVG_URL) : Promise.resolve({ ok: true, text: () => svgText })
        ]);
        if (!data && dataResponse.ok) data = await dataResponse.json();
        if (!svgText && svgResponse.ok) svgText = await svgResponse.text();
      } catch (err) {
        console.warn("Dynamic fetch skipped, using memory bundle.", err);
      }
    }

    if (!data || !svgText) {
      setLoaderProgress(100, "載入失敗，正在重試...");
      dismissLoader();
      return;
    }

    setLoaderProgress(45, "解析 239 個天賦節點...");
    // Pre-clean and cache all text strings during initialization
    state.nodes = (data.nodes || []).map((node) => ({
      ...node,
      branch_zh: branchName(node.branch),
      node_type_zh: nodeTypeName(node.node_type),
      _nameClean: resolveGameText(node.name_zh, node),
      _descClean: resolveGameText(node.description_zh, node),
      _awakenClean: resolveGameText(node.dice_awaken, node),
      _unlockClean: resolveGameText(node.unlock_condition_zh, node),
      _searchText: nodeSearchText(node),
    }));

    state.nodeById = new Map(state.nodes.map((node) => [node.id, node]));

    setLoaderProgress(60, "繪製天賦樹圖層...");
    scene.innerHTML = svgText;
    scene.setAttribute("aria-hidden", "false");
    scene.querySelector("svg")?.setAttribute("aria-label", "Random Dice 2 骰子樹完整地圖");

    updateViewportSizeCache();
    wireNodes();

    // --- 將即時渲染、幾何換算與索引負擔全面遷移至加載期 ---
    setLoaderProgress(65, "建立節點連線關係...");
    preindexEdges();

    setLoaderProgress(75, "計算前置解鎖鏈路...");
    precomputePrerequisiteGraph();

    setLoaderProgress(82, "建立搜尋與關鍵字索引...");
    prebuildSearchIndex();

    setLoaderProgress(88, "計算節點幾何與派系分組...");
    precomputeGeometryAndGroups();

    setLoaderProgress(94, "準備資訊卡片快取...");
    precompileTooltipPanels();

    setLoaderProgress(98, "產生全景小地圖...");
    prebakeMinimap();
    renderMinimap();

    connectControls();

    searchStatus.textContent = `${state.nodes.length} 個節點`;
    // 預設 100% 縮放並位於正中間
    resetToCenter(true);

    setLoaderProgress(100, "載入完成");
    setTimeout(() => {
      dismissLoader();
    }, 280);
  }

  window.__TEST_HOOKS__ = {
    showTooltip,
    centerOnNode,
    closeTooltip
  };

  loadMap();
})();
