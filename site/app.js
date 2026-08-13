(() => {
  "use strict";

  const MAP_WIDTH = 4000;
  const MAP_HEIGHT = 3400;
  const MIN_SCALE = 0.33; // 最小 33%
  const MAX_SCALE = 2.0;  // 最大 200%
  const DATA_URL = "data/dice_tree.json";
  const SVG_URL = "data/dice_tree.svg";

  // Perceptually Uniform OKLCH Faction System & High Contrast Tokens
  const FACTION_DATA = {
    1: { name: "自然", color: "#7ee352", surface: "rgba(126, 227, 82, 0.14)", border: "rgba(126, 227, 82, 0.35)", ink: "#071203" },
    2: { name: "工學", color: "#f5d358", surface: "rgba(245, 211, 88, 0.14)", border: "rgba(245, 211, 88, 0.35)", ink: "#140d02" },
    3: { name: "魔法", color: "#5da0ff", surface: "rgba(93, 160, 255, 0.14)", border: "rgba(93, 160, 255, 0.35)", ink: "#030c18" },
    4: { name: "秩序", color: "#baa6e0", surface: "rgba(186, 166, 224, 0.14)", border: "rgba(186, 166, 224, 0.35)", ink: "#11091a" },
    5: { name: "混沌", color: "#cb65ff", surface: "rgba(203, 101, 255, 0.14)", border: "rgba(203, 101, 255, 0.35)", ink: "#14031a" },
  };

  // 五大派系遊戲原版選取框色彩配置（底框與對稱旋轉光芒）
  const FACTION_SELECTION_COLORS = {
    1: { name: "自然", base: "#89E464", runner: "#D7FFA4" },
    2: { name: "工學", base: "#F5DA68", runner: "#FFFFA2" },
    3: { name: "魔法", base: "#4692F1", runner: "#7CFAFD" },
    4: { name: "秩序", base: "#9F95C1", runner: "#FFFEFF" },
    5: { name: "混沌", base: "#A93BEA", runner: "#EE6CFA" },
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
  const minimapToggle = $("#minimap-toggle");
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
    showCurrencyBadges: true,

    pointers: new Map(),
    drag: null,
    pinch: null,
  };

  // --- Natural Language Game Text Engine (Clean, High Contrast, No AI Slop) ---
  function formatGameText(rawText, node) {
    if (!rawText) return "";
    let text = String(rawText);

    if (node) {
      if (node.node_type === "PLAYER_PASSIVE") {
        const v0 = node.passive_value ?? "0";
        const v1 = node.passive_rank_add ? `（每階 +${node.passive_rank_add}%）` : "";
        text = text.replace(/\{0\}/g, `<strong>${v0}</strong>`)
                   .replace(/<color=[^>]*>\(\+\{1\}%?\b[^)]*\)<\/color>|\(\+\{1\}%?\b[^)]*\)/gi, v1)
                   .replace(/\{1\}/g, node.passive_rank_add || "");
      } else if (node.node_type === "DICE_RUNE") {
        const v1 = node.rune_value1 ?? "";
        const v1_add = node.rune_value1_rank_add ? `（每階 +${node.rune_value1_rank_add}%）` : "";
        const v2 = node.rune_value2 ?? "";
        const v2_add = node.rune_value2_rank_add ? `（每階 +${node.rune_value2_rank_add}%）` : "";
        const dur = node.rune_duration ?? "";
        const dur_add = node.rune_duration_rank_add ? `（每階 +${node.rune_duration_rank_add}秒）` : "";

        let p0 = v1 ? `<strong>${v1}</strong>` : "";
        let p1 = node.rune_value1_rank_add || (v2 && !text.includes("{2}") ? `<strong>${v2}</strong>` : "");
        let p2 = v2 ? `<strong>${v2}</strong>` : "";
        let p3 = node.rune_value2_rank_add || "";
        let p4 = dur ? `<strong>${dur}</strong>` : "";
        let p5 = node.rune_duration_rank_add || "";

        if (node.rune_value1_rank_add) {
          text = text.replace(/<color=[^>]*>\(\+\{1\}(%?|秒?|個?|次?)\)<\/color>|\(\+\{1\}(%?|秒?|個?|次?)\)/gi, (m, u) => `（每階 +${node.rune_value1_rank_add}${u || (text.includes("{0}%") ? "%" : "")}）`);
        }
        if (node.rune_value2_rank_add) {
          text = text.replace(/<color=[^>]*>\(\+\{3\}(%?|秒?)\)<\/color>|\(\+\{3\}(%?|秒?)\)/gi, v2_add);
        }
        if (node.rune_duration_rank_add) {
          text = text.replace(/<color=[^>]*>\(\+\{5\}(%?|秒?)\)<\/color>|\(\+\{5\}(%?|秒?)\)/gi, dur_add);
        }

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

    text = text.replace(/<color=[^>]*>\(\+\s*[%秒]?\)<\/color>|\(\+\s*[%秒]?\)/gi, "");

    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/<tag>([A-Za-z0-9_]+)<\/tag>/gi, (_, tag) => TAG_MAP[tag.toUpperCase()] || tag)
      .replace(/<color=[^>]*>(.*?)<\/color>/gi, '$1')
      .replace(/<br\s*\/?>/gi, " ")
      .trim();
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
    const marginX = Math.min(320, width * 0.45);
    const marginY = Math.min(280, height * 0.4);

    let minPanX, maxPanX, minPanY, maxPanY;

    if (scaledWidth <= width) {
      minPanX = maxPanX = (width - scaledWidth) / 2;
    } else {
      minPanX = width - scaledWidth - marginX;
      maxPanX = marginX;
    }

    if (scaledHeight <= height) {
      minPanY = maxPanY = (height - scaledHeight) / 2;
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
    scene.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.scale})`;
    updateLodState();
    const targetAnchorId = closingNodeId || state.selectedId;
    if (!tooltip.hidden && targetAnchorId && window.innerWidth > 768) {
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

      zoomReadout.textContent = `${Math.round(state.scale * 100)}%`;

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
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    const { width, height } = viewportSize();
    const cx = width / 2;
    const cy = height / 2;

    const wx = anchorWorldX !== null ? anchorWorldX : (cx - state.panX) / state.scale;
    const wy = anchorWorldY !== null ? anchorWorldY : (cy - state.panY) / state.scale;

    const targetPanX = cx - wx * clampedScale;
    const targetPanY = cy - wy * clampedScale;

    if (immediate) {
      zoomAnim = null;
      state.scale = clampedScale;
      state.targetScale = clampedScale;
      state.panX = targetPanX;
      state.panY = targetPanY;
      state.targetPanX = targetPanX;
      state.targetPanY = targetPanY;
      applySceneTransform();
      updateMinimapWindow();
      zoomReadout.textContent = `${Math.round(state.scale * 100)}%`;
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
      zoomReadout.textContent = `${Math.round(state.scale * 100)}%`;
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

  // 預設 100% 縮放且位於正中間
  function resetToCenter(immediate = false) {
    const { width, height } = viewportSize();
    state.targetScale = 1.0;
    state.targetPanX = (width - MAP_WIDTH * 1.0) / 2;
    state.targetPanY = (height - MAP_HEIGHT * 1.0) / 2;
    startCameraZoom(1.0, MAP_WIDTH / 2, MAP_HEIGHT / 2, immediate);
    interactionStatus.textContent = "已重設為 100% 縮放（居中）";
  }

  function fitToViewport(immediate = false) {
    const { width, height } = viewportSize();
    const horizontalRoom = Math.max(300, width - 60);
    const verticalRoom = Math.max(260, height - 120);
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(horizontalRoom / MAP_WIDTH, verticalRoom / MAP_HEIGHT)));

    state.targetScale = nextScale;
    state.targetPanX = (width - MAP_WIDTH * nextScale) / 2;
    state.targetPanY = (height - MAP_HEIGHT * nextScale) / 2;
    startCameraZoom(nextScale, MAP_WIDTH / 2, MAP_HEIGHT / 2, immediate);
    interactionStatus.textContent = "已顯示完整骰子樹全景";
  }

  // 縮放始終以「目前畫面中心」為中心錨點
  function setZoom(nextScale, immediate = false) {
    startCameraZoom(nextScale, null, null, immediate);
    interactionStatus.textContent = `視野縮放：${Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale)) * 100)}%`;
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

  // --- High-Performance Minimap Canvas Rendering (Path Batching: 6 Calls Total) ---
  function renderMinimap() {
    if (!minimapCanvas || !state.nodes.length) return;
    const ctx = minimapCanvas.getContext("2d");
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const scaleX = w / MAP_WIDTH;
    const scaleY = h / MAP_HEIGHT;

    ctx.clearRect(0, 0, w, h);

    // Background subtle dark tone
    ctx.fillStyle = "#0b0d13";
    ctx.fillRect(0, 0, w, h);

    // 1. Batch Draw Connecting Lines (1 Draw Call for all 300+ edges)
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

    // 2. Batch Draw Node Dots by Faction (5 Draw Calls Total)
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

    // Draw regular dots by color
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
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }
    });
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
    Invader: "混沌",
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

    const fragment = document.createDocumentFragment();

    // 1. 核心效果（流暢繁中排版，數值加粗純白，無花哨碎標籤）
    const descHtml = formatGameText(node.description_zh, node);
    if (descHtml) {
      const section = document.createElement("div");
      section.className = "detail-section";
      const p = document.createElement("p");
      p.className = "detail-copy";
      p.innerHTML = descHtml;
      section.append(p);
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

    // 3. 戰鬥指標（清晰高價值核心數值，不含屬性、品階、適用等冗餘欄位）
    const statItems = [];
    if (node.dice_attack) statItems.push(["基礎攻擊", node.dice_attack]);
    if (node.dice_attack_interval) statItems.push(["攻速間隔", `${node.dice_attack_interval} 秒`]);
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

    // 4. 元數據區（消耗與前置）
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
    } else {
      const unlockCostHtml = formatCostHtml(unlockGold, unlockCore);
      if (unlockCostHtml) {
        const lineCost = document.createElement("div");
        lineCost.className = "meta-line";
        lineCost.innerHTML = `
          <span>解鎖消耗</span>
          <span class="meta-cost">${unlockCostHtml}</span>
        `;
        metaBox.append(lineCost);
      }
    }

    if (maxRank > 1) {
      const totalCostHtml = formatCostHtml(totalGold, totalCore);
      if (totalCostHtml && (specialUnlock || totalCostHtml !== formatCostHtml(unlockGold, unlockCore))) {
        const lineTotal = document.createElement("div");
        lineTotal.className = "meta-line";
        lineTotal.innerHTML = `
          <span>滿階累計</span>
          <span class="meta-cost">${totalCostHtml}</span>
        `;
        metaBox.append(lineTotal);
      }
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
        btn.textContent = `${inc._nameClean || formatValue(inc.name_zh)} →`;
        btn.title = `跳轉至 ${inc._nameClean || inc.name_zh}`;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          centerOnNode(inc.id, false);
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

    // 升階明細表格（多階節點專用，乾淨收納，0值顯示為—）
    if (maxRank > 1) {
      const tableContainer = document.createElement("div");
      tableContainer.className = "upgrade-table-container";
      const table = document.createElement("table");
      table.className = "upgrade-table";
      table.innerHTML = `
        <thead>
          <tr>
            <th>階級</th>
            <th>單階金幣</th>
            <th>單階核心</th>
            <th>累計金幣</th>
            <th>累計核心</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector("tbody");
      let cumGold = 0;
      let cumCore = 0;
      for (let r = 1; r <= maxRank; r++) {
        const g = goldCosts[r - 1] || 0;
        const c = coreCosts[r - 1] || 0;
        cumGold += g;
        cumCore += c;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>第 ${r} 階</td>
          <td>${g > 0 ? `${SVG_ICONS.gold} ${g.toLocaleString()}` : "—"}</td>
          <td>${c > 0 ? `${SVG_ICONS.core} ${c.toLocaleString()}` : "—"}</td>
          <td>${cumGold > 0 ? `${SVG_ICONS.gold} ${cumGold.toLocaleString()}` : "—"}</td>
          <td>${cumCore > 0 ? `${SVG_ICONS.core} ${cumCore.toLocaleString()}` : "—"}</td>
        `;
        tbody.append(tr);
      }
      tableContainer.append(table);
      metaBox.append(tableContainer);
    }

    fragment.append(metaBox);
    tooltipBody.replaceChildren(fragment);
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
    if (window.innerWidth <= 768) {
      tooltip.style.left = "";
      tooltip.style.top = "";
      tooltip.style.transform = "translateY(0)";
      return;
    }

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

    const top = screenY - nodeRadius - cachedTipHeight - 14;
    const left = screenX - cachedTipWidth / 2;

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  let sheetDismissTimer = null;
  let tooltipCloseTimer = null;
  let tooltipSwitchTimer = null;
  let tooltipEnterTimer = null;
  let closingNodeId = null;

  function showTooltip(nodeId, pinned = false) {
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

  function applySearch(query) {
    const normalized = normalizeSearchString(query.trim());
    const tokens = normalized.split(/\s+/).filter(Boolean);
    state.resultIndex = tokens.length ? 0 : -1;
    state.matches = tokens.length
      ? state.nodes.filter((node) => tokens.every((token) => node._searchText.includes(token)))
      : [];

    scene.classList.toggle("has-search", tokens.length > 0);

    // O(1) Match Lookup with Set & Dirty Check Batching
    const currentMatchedIds = new Set(state.matches.map((n) => n.id));

    if (tokens.length === 0) {
      prevMatchedIds.forEach((id) => state.elementsById.get(id)?.classList.remove("is-match"));
      prevMatchedIds.clear();
    } else {
      // Remove classes only from nodes that are no longer matched
      prevMatchedIds.forEach((id) => {
        if (!currentMatchedIds.has(id)) {
          state.elementsById.get(id)?.classList.remove("is-match");
        }
      });
      // Add classes only to newly matched nodes
      currentMatchedIds.forEach((id) => {
        if (!prevMatchedIds.has(id)) {
          state.elementsById.get(id)?.classList.add("is-match");
        }
      });
      prevMatchedIds = currentMatchedIds;
    }

    searchClear.hidden = tokens.length === 0;
    if (tokens.length === 0) {
      if (state.filterBranches.size > 0 || state.filterTypes.size > 0) {
        applyFilterHighlighting();
      } else {
        searchStatus.textContent = `${state.nodes.length} 個節點`;
      }
      emptyState.hidden = true;
    } else if (!state.matches.length) {
      searchStatus.textContent = "找不到符合節點";
      emptyState.hidden = false;
    } else {
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

    document.body.classList.toggle("has-active-filter", hasAnyFilter);
    if (filterClearBtn) {
      filterClearBtn.hidden = !hasAnyFilter;
    }

    if (!hasAnyFilter) {
      state.elementsById.forEach((element) => {
        element.classList.remove("is-filter-matched");
      });
      scene.querySelectorAll("path.edge.is-filter-edge, line.edge.is-filter-edge, path.tree-center-link.is-filter-edge").forEach((pathEl) => {
        pathEl.classList.remove("is-filter-edge");
      });
      scene.querySelectorAll(".tree-center [data-branch]").forEach((el) => {
        el.classList.remove("is-branch-active");
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

    // 向上回溯所有符合條件節點至初始起點的完整分支脈絡鏈路
    const activePathNodeIds = new Set(matchedNodeIds);
    const queue = [...matchedNodeIds];
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

    // 收集所有活躍路徑涵蓋的陣營
    const activeBranches = new Set();
    activePathNodeIds.forEach((id) => {
      const n = state.nodeById.get(id);
      if (n && n.branch) activeBranches.add(Number(n.branch));
    });

    // 標記節點樣式（僅直接匹配之節點高亮，前置節點不顯示高亮）
    state.elementsById.forEach((element, id) => {
      const isDirectMatch = matchedNodeIds.includes(id);
      element.classList.toggle("is-filter-matched", isDirectMatch);
    });

    // 標記分支線條高亮（從已標示節點到初始起點的分支連線，不需要派系光暈）
    scene.querySelectorAll("path.edge").forEach((pathEl) => {
      const d = pathEl.getAttribute("d") || "";
      const match = /M\s+([\d.-]+)\s+([\d.-]+)\s+L\s+([\d.-]+)\s+([\d.-]+)/.exec(d);
      if (match) {
        const x1 = parseFloat(match[1]), y1 = parseFloat(match[2]);
        const x2 = parseFloat(match[3]), y2 = parseFloat(match[4]);
        let startNodeId = null;
        let endNodeId = null;
        for (const id of activePathNodeIds) {
          const pt = state.nodePositions.get(id);
          if (!pt) continue;
          if (!startNodeId && Math.hypot(pt.x - x1, pt.y - y1) < 14) startNodeId = id;
          if (!endNodeId && Math.hypot(pt.x - x2, pt.y - y2) < 14) endNodeId = id;
          if (startNodeId && endNodeId) break;
        }

        const isConnectedBranch = Boolean(
          startNodeId && endNodeId &&
          (activePathNodeIds.has(startNodeId) && activePathNodeIds.has(endNodeId))
        );
        pathEl.classList.toggle("is-filter-edge", isConnectedBranch);
      }
    });

    // 標記中央至五大初始起點的線段（只要該陣營有節點在活躍路徑中即點亮）
    scene.querySelectorAll("path.tree-center-link").forEach((linkEl) => {
      const d = linkEl.getAttribute("d") || "";
      let isBranchActive = false;
      if (d.includes("1460.00") && activeBranches.has(1)) isBranchActive = true; // 自然 (火)
      else if (d.includes("1840.00") && activeBranches.has(2)) isBranchActive = true; // 工學 (雷)
      else if (d.includes("2160.00") && activeBranches.has(3)) isBranchActive = true; // 魔法 (冰)
      else if (d.includes("1720.00") && activeBranches.has(4)) isBranchActive = true; // 秩序 (風/陰陽/迪奇)
      else if (d.includes("2280.00") && activeBranches.has(5)) isBranchActive = true; // 混沌 (恐懼/吞噬/貪婪)

      linkEl.classList.toggle("is-filter-edge", isBranchActive);
    });

    // 標記中央五大分支圖示與文字（活躍陣營點亮，其餘暗化）
    scene.querySelectorAll(".tree-center [data-branch]").forEach((el) => {
      const b = Number(el.getAttribute("data-branch"));
      el.classList.toggle("is-branch-active", activeBranches.has(b));
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
  let dragRafPending = false;

  function pointerDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pointerCenter(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function startPinch() {
    const points = [...state.pointers.values()];
    if (points.length !== 2) return;
    const [a, b] = points;
    const center = pointerCenter(a, b);
    const rect = viewport.getBoundingClientRect();
    const initialDistance = Math.max(10, pointerDistance(a, b));

    setNavigating(true);
    state.pinch = {
      initialDistance,
      initialScale: state.targetScale,
      mapX: (center.x - rect.left - state.targetPanX) / state.targetScale,
      mapY: (center.y - rect.top - state.targetPanY) / state.targetScale,
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
    state.pointerSamples = [{ x: event.clientX, y: event.clientY, time: performance.now() }];

    if (state.pointers.size === 2) {
      startPinch();
      event.preventDefault();
      return;
    }

    if (state.pointers.size === 1) {
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

    const now = performance.now();
    if (!state.pointerSamples) state.pointerSamples = [];
    state.pointerSamples.push({ x: event.clientX, y: event.clientY, time: now });
    while (state.pointerSamples.length > 2 && now - state.pointerSamples[0].time > 85) {
      state.pointerSamples.shift();
    }

    // 2-finger pinch zoom
    if (state.pointers.size === 2 && state.pinch) {
      setZooming(true);
      state.drag = null; // 縮放時鎖定純縮放，避免誤觸發平移
      const points = [...state.pointers.values()];
      const [a, b] = points;
      const distance = Math.max(10, pointerDistance(a, b));
      const center = pointerCenter(a, b);
      const rect = viewport.getBoundingClientRect();

      setNavigating(true);
      const scaleRatio = distance / state.pinch.initialDistance;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, state.pinch.initialScale * scaleRatio));

      state.targetScale = nextScale;
      state.targetPanX = center.x - rect.left - state.pinch.mapX * nextScale;
      state.targetPanY = center.y - rect.top - state.pinch.mapY * nextScale;

      setTransform({ immediate: true });
      event.preventDefault();
      return;
    }

    // 1-finger canvas drag with single RAF Batching
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
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

      if (!dragRafPending) {
        dragRafPending = true;
        requestAnimationFrame(() => {
          dragRafPending = false;
          applySceneTransform();
          updateMinimapWindow();
        });
      }
      event.preventDefault();
    }
  }

  function onViewportPointerUp(event) {
    state.pointers.delete(event.pointerId);

    if (state.pinch) {
      state.justPinched = true;
      window.setTimeout(() => {
        state.justPinched = false;
      }, 250);

      if (state.pointers.size === 1) {
        const [remainingId, pos] = [...state.pointers.entries()][0];
        state.drag = {
          pointerId: remainingId,
          startX: pos.x,
          startY: pos.y,
          startTime: performance.now(),
          initialPanX: state.targetPanX,
          initialPanY: state.targetPanY,
          isDragging: true,
        };
      }
      state.pinch = null;
    }

    if (!state.pointers.size) {
      const moved = state.drag?.isDragging;

      if (moved) {
        // 計算釋放瞬間的滑動速度向量 (Velocity)
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
        const maxInitialSpeed = 2.4;
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
      }
      state.drag = null;
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
    const zoomMultiplier = Math.exp(-event.deltaY * 0.0018);
    targetWheelScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetWheelScale * zoomMultiplier));

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
          zoomReadout.textContent = `${Math.round(state.scale * 100)}%`;

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
        zoomReadout.textContent = `${Math.round(state.scale * 100)}%`;

        wheelZoomRafId = requestAnimationFrame(smoothWheelZoomStep);
      }

      wheelZoomRafId = requestAnimationFrame(smoothWheelZoomStep);
    }
  }

  // --- Mobile Bottom Sheet Gesture Support ---
  let sheetTouchStartY = 0;
  let sheetTouchCurrentY = 0;
  let isSheetDragging = false;

  function initBottomSheetGestures() {
    if (!sheetHandle) return;

    const handleTouchStart = (e) => {
      if (window.innerWidth > 768) return;
      if (!e.touches || !e.touches.length) return;
      if (e.target.closest("button")) return;
      sheetTouchStartY = e.touches[0].clientY;
      sheetTouchCurrentY = sheetTouchStartY;
      isSheetDragging = true;
      tooltip.style.transition = "none";
    };

    sheetHandle.addEventListener("touchstart", handleTouchStart, { passive: true });
    const header = tooltip.querySelector(".tooltip-header");
    header?.addEventListener("touchstart", handleTouchStart, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!isSheetDragging || !e.touches.length) return;
      sheetTouchCurrentY = e.touches[0].clientY;
      const deltaY = sheetTouchCurrentY - sheetTouchStartY;
      if (deltaY > 0) {
        tooltip.style.transform = `translateY(${deltaY}px)`;
      } else {
        tooltip.style.transform = `translateY(${deltaY * 0.2}px)`;
      }
    }, { passive: true });

    const handleTouchEnd = () => {
      if (!isSheetDragging) return;
      isSheetDragging = false;
      const deltaY = sheetTouchCurrentY - sheetTouchStartY;
      tooltip.style.transition = "transform 240ms cubic-bezier(0.16, 1, 0.3, 1)";
      if (deltaY > 70) {
        tooltip.style.transform = "translateY(100%)";
        if (sheetDismissTimer) clearTimeout(sheetDismissTimer);
        sheetDismissTimer = setTimeout(() => {
          closeTooltip(true);
          tooltip.style.transform = "";
          sheetDismissTimer = null;
        }, 240);
      } else {
        tooltip.style.transform = "translateY(0)";
      }
    };

    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
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
    const tipHeight = tooltip.offsetHeight || 320;
    const nodeRadius = 65; // 節點本體半徑 + 內外邊框
    const GAP = 14;
    
    const targetNodeScreenY = height / 2 + nodeRadius + tipHeight / 2 + GAP;
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

  // --- Prerequisite Path Highlighting & Traversal System ---
  function showPrerequisitePath(targetNodeId) {
    const targetNode = state.nodeById.get(targetNodeId);
    if (!targetNode) return;

    // BFS 遍歷所有祖先節點（完整前置養成鏈路）
    const prereqNodeIds = new Set([targetNodeId]);
    const queue = [targetNodeId];
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

    // 收集前置節點所在分支
    const prereqBranches = new Set();
    prereqNodeIds.forEach((id) => {
      const n = state.nodeById.get(id);
      if (n && n.branch) prereqBranches.add(Number(n.branch));
    });

    state.activePrereqNodeIds = prereqNodeIds;
    state.activePrereqTargetId = targetNodeId;

    document.body.classList.add("has-prereq-highlight");
    scene.classList.add("has-prereq-highlight");

    // 標記節點高亮
    state.elementsById.forEach((element, id) => {
      const isPrereq = prereqNodeIds.has(id);
      const isTarget = id === targetNodeId;
      element.classList.toggle("is-prereq-active", isPrereq);
      element.classList.toggle("is-prereq-target", isTarget);
    });

    // 標記連線高亮 (Edge Highlighting: 必須兩端皆為前置路徑節點，絕不標記往後延伸的分支線段)
    scene.querySelectorAll("path.edge").forEach((pathEl) => {
      const d = pathEl.getAttribute("d") || "";
      const match = /M\s+([\d.-]+)\s+([\d.-]+)\s+L\s+([\d.-]+)\s+([\d.-]+)/.exec(d);
      if (match) {
        const x1 = parseFloat(match[1]), y1 = parseFloat(match[2]);
        const x2 = parseFloat(match[3]), y2 = parseFloat(match[4]);
        let hasNode1 = false;
        let hasNode2 = false;
        for (const id of prereqNodeIds) {
          const pt = state.nodePositions.get(id);
          if (!pt) continue;
          if (Math.hypot(pt.x - x1, pt.y - y1) < 14) hasNode1 = true;
          if (Math.hypot(pt.x - x2, pt.y - y2) < 14) hasNode2 = true;
          if (hasNode1 && hasNode2) break;
        }
        pathEl.classList.toggle("is-prereq-edge", hasNode1 && hasNode2);
      }
    });

    // 標記中央至起點的連線高亮
    scene.querySelectorAll("path.tree-center-link").forEach((linkEl) => {
      const d = linkEl.getAttribute("d") || "";
      let isBranchPrereq = false;
      if (d.includes("1460.00") && prereqBranches.has(1)) isBranchPrereq = true; // 自然 (火)
      else if (d.includes("1840.00") && prereqBranches.has(2)) isBranchPrereq = true; // 工學 (雷)
      else if (d.includes("2160.00") && prereqBranches.has(3)) isBranchPrereq = true; // 魔法 (冰)
      else if (d.includes("1720.00") && prereqBranches.has(4)) isBranchPrereq = true; // 秩序 (風/陰陽/迪奇)
      else if (d.includes("2280.00") && prereqBranches.has(5)) isBranchPrereq = true; // 混沌 (恐懼/吞噬/貪婪)

      linkEl.classList.toggle("is-prereq-edge", isBranchPrereq);
    });

    // 標記中央圖示與數字高亮
    scene.querySelectorAll(".tree-center [data-branch]").forEach((el) => {
      const b = Number(el.getAttribute("data-branch"));
      el.classList.toggle("is-branch-active", prereqBranches.has(b));
    });
  }

  function clearPrereqHighlight(resetButtonState = false) {
    state.activePrereqNodeIds = null;
    state.activePrereqTargetId = null;

    document.body.classList.remove("has-prereq-highlight");
    scene.classList.remove("has-prereq-highlight");

    state.elementsById.forEach((element) => {
      element.classList.remove("is-prereq-active", "is-prereq-target");
    });

    scene.querySelectorAll("path.edge.is-prereq-edge, path.tree-center-link.is-prereq-edge").forEach((pathEl) => {
      pathEl.classList.remove("is-prereq-edge");
    });

    scene.querySelectorAll(".tree-center [data-branch]").forEach((el) => {
      el.classList.remove("is-branch-active");
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

    // Minimap Toggle for Mobile
    minimapToggle?.addEventListener("click", () => {
      minimapPanel.classList.toggle("is-open");
    });

    tooltipClose?.addEventListener("click", closeTooltip);

    // 120ms Debounced search
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        applySearch(searchInput.value);
      }, 120);
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

    // 點擊空白處時收合手機端搜尋膠囊（若無搜尋輸入內容）
    window.addEventListener("click", (e) => {
      if (window.innerWidth <= 768 && searchField?.classList.contains("is-expanded")) {
        const insideSearch = Boolean(e.target.closest(".search-block"));
        if (!insideSearch && !searchInput.value.trim()) {
          searchField.classList.remove("is-expanded");
        }
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
        positionTooltipDesktop(state.selectedId);
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
        searchResults.hidden = true;
      } else if (event.key === "+" || event.key === "=") {
        setZoom(state.targetScale * 1.25, false);
      } else if (event.key === "-" || event.key === "_") {
        setZoom(state.targetScale / 1.25, false);
      } else if (event.key === "0") {
        resetToCenter(false);
      }
    });

    initBottomSheetGestures();
  }

  async function loadMap() {
    let data = window.__DICE_TREE_DATA__;
    let svgText = window.__DICE_TREE_SVG__;

    if (!data || !svgText) {
      try {
        const [dataResponse, svgResponse] = await Promise.all([fetch(DATA_URL), fetch(SVG_URL)]);
        if (dataResponse.ok && svgResponse.ok) {
          data = await dataResponse.json();
          svgText = await svgResponse.text();
        }
      } catch (err) {
        console.warn("Dynamic fetch skipped, waiting for bundle.", err);
      }
    }

    if (!data || !svgText) return;

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

    scene.innerHTML = svgText;
    scene.setAttribute("aria-hidden", "false");
    scene.querySelector("svg")?.setAttribute("aria-label", "Random Dice 2 骰子樹完整地圖");

    updateViewportSizeCache();
    wireNodes();
    renderMinimap();
    connectControls();

    searchStatus.textContent = `${state.nodes.length} 個節點`;
    // 預設 100% 縮放並位於正中間
    resetToCenter(true);
  }

  loadMap();
})();
