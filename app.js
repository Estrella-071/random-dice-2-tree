(() => {
  "use strict";

  const MAP_WIDTH = 4000;
  const MAP_HEIGHT = 3400;
  const MIN_SCALE = 0.18;
  const MAX_SCALE = 4.5;
  const DATA_URL = "data/dice_tree.json";
  const SVG_URL = "data/dice_tree.svg";

  const $ = (selector) => document.querySelector(selector);
  const viewport = $("#viewport");
  const scene = $("#scene");
  const loading = $("#loading");
  const errorState = $("#error-state");
  const emptyState = $("#empty-state");
  const searchInput = $("#search-input");
  const searchClear = $("#search-clear");
  const searchResults = $("#search-results");
  const searchStatus = $("#search-status");
  const minimap = $("#minimap");
  const minimapWindow = $("#minimap-window");
  const tooltip = $("#tooltip");
  const tooltipTitle = $("#tooltip-title");
  const tooltipKicker = $("#tooltip-kicker");
  const tooltipBody = $("#tooltip-body");
  const zoomReadout = $("#zoom-readout");
  const interactionStatus = $("#interaction-status");

  const state = {
    scale: 0.3,
    panX: 0,
    panY: 0,
    nodes: [],
    nodeById: new Map(),
    elementsById: new Map(),
    matches: [],
    resultIndex: -1,
    hoveredId: null,
    selectedId: null,
    tooltipPinned: false,
    pointers: new Map(),
    drag: null,
    pinch: null,
    transformFrame: 0,
    tooltipFrame: 0,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function decodeHtml(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(value ?? "");
    return textarea.value;
  }

  function cleanGameText(value) {
    return decodeHtml(value)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/color>/gi, "")
      .replace(/<color=[^>]*>/gi, "")
      .replace(/<\/tag>/gi, "")
      .replace(/<tag>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function formatValue(value, fallback = "—") {
    const cleaned = cleanGameText(value);
    return cleaned || fallback;
  }

  function listToText(list) {
    if (!Array.isArray(list) || list.length === 0) return "";
    return list.join("、");
  }

  function branchColor(branch) {
    return {
      1: "#ef625e",
      2: "#50b7d8",
      3: "#a871ec",
      4: "#f3bd55",
      5: "#e979a5",
    }[Number(branch)] || "#9b8bf5";
  }

  function nodeSearchText(node) {
    return [
      node.name_zh,
      node.short_label,
      node.description_zh,
      node.dice_awaken,
      node.dice_type,
      node.dice_group,
      node.branch_zh,
      node.node_type_zh,
      node.unlock_condition_zh,
      node.icon_name,
    ]
      .map(cleanGameText)
      .join(" ")
      .toLocaleLowerCase("zh-Hant-TW");
  }

  function scheduleTransform() {
    if (state.transformFrame) return;
    state.transformFrame = requestAnimationFrame(() => {
      state.transformFrame = 0;
      scene.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.scale})`;
      zoomReadout.textContent = `${Math.round(state.scale * 100)}%`;
      updateMinimap();
    });
  }

  function viewportSize() {
    return { width: viewport.clientWidth, height: viewport.clientHeight };
  }

  function clampPan() {
    const { width, height } = viewportSize();
    const scaledWidth = MAP_WIDTH * state.scale;
    const scaledHeight = MAP_HEIGHT * state.scale;
    const marginX = Math.min(260, width * 0.38);
    const marginY = Math.min(220, height * 0.34);

    if (scaledWidth <= width) {
      state.panX = (width - scaledWidth) / 2;
    } else {
      state.panX = Math.min(marginX, Math.max(width - scaledWidth - marginX, state.panX));
    }

    if (scaledHeight <= height) {
      state.panY = (height - scaledHeight) / 2;
    } else {
      state.panY = Math.min(marginY, Math.max(height - scaledHeight - marginY, state.panY));
    }
  }

  function setTransform({ animate = false } = {}) {
    if (animate) scene.classList.add("is-animating");
    else scene.classList.remove("is-animating");
    clampPan();
    scheduleTransform();
    if (animate) {
      window.setTimeout(() => scene.classList.remove("is-animating"), 260);
    }
  }

  function fitToViewport(animate = true) {
    const { width, height } = viewportSize();
    const horizontalRoom = Math.max(300, width - 80);
    const verticalRoom = Math.max(260, height - 150);
    state.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(horizontalRoom / MAP_WIDTH, verticalRoom / MAP_HEIGHT)));
    state.panX = (width - MAP_WIDTH * state.scale) / 2;
    state.panY = (height - MAP_HEIGHT * state.scale) / 2;
    setTransform({ animate });
    interactionStatus.textContent = "已顯示完整骰子樹";
  }

  function setZoom(nextScale, clientX, clientY, animate = false) {
    const oldScale = state.scale;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    if (scale === oldScale) return;

    const rect = viewport.getBoundingClientRect();
    const localX = clientX == null ? rect.width / 2 : clientX - rect.left;
    const localY = clientY == null ? rect.height / 2 : clientY - rect.top;
    const mapX = (localX - state.panX) / oldScale;
    const mapY = (localY - state.panY) / oldScale;
    state.scale = scale;
    state.panX = localX - mapX * scale;
    state.panY = localY - mapY * scale;
    setTransform({ animate });
    interactionStatus.textContent = "滾輪縮放中";
  }

  function centerOnNode(nodeId, animate = true) {
    const node = state.nodeById.get(nodeId);
    if (!node) return;
    const element = state.elementsById.get(nodeId);
    const point = nodePoint(element);
    if (!point) return;
    const { width, height } = viewportSize();
    state.panX = width / 2 - point.x * state.scale;
    state.panY = height / 2 - point.y * state.scale;
    setTransform({ animate });
    interactionStatus.textContent = `已定位：${formatValue(node.name_zh)}`;
  }

  function nodePoint(element) {
    if (!element) return null;
    const transform = element.getAttribute("transform") || "";
    const match = transform.match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)/i);
    if (match) return { x: Number(match[1]), y: Number(match[2]) };
    const rect = element.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    return {
      x: (rect.left + rect.width / 2 - viewportRect.left - state.panX) / state.scale,
      y: (rect.top + rect.height / 2 - viewportRect.top - state.panY) / state.scale,
    };
  }

  function updateMinimap() {
    if (!state.nodes.length) return;
    const { width, height } = viewportSize();
    const visibleX = Math.max(0, Math.min(MAP_WIDTH, -state.panX / state.scale));
    const visibleY = Math.max(0, Math.min(MAP_HEIGHT, -state.panY / state.scale));
    const visibleWidth = Math.min(MAP_WIDTH, width / state.scale);
    const visibleHeight = Math.min(MAP_HEIGHT, height / state.scale);
    minimapWindow.style.left = `${(visibleX / MAP_WIDTH) * 100}%`;
    minimapWindow.style.top = `${(visibleY / MAP_HEIGHT) * 100}%`;
    minimapWindow.style.width = `${(visibleWidth / MAP_WIDTH) * 100}%`;
    minimapWindow.style.height = `${(visibleHeight / MAP_HEIGHT) * 100}%`;
  }

  function addTooltipSection(label, value, className = "tooltip-copy") {
    const text = cleanGameText(value);
    if (!text) return;
    const section = document.createElement("section");
    section.className = "tooltip-section";
    const heading = document.createElement("p");
    heading.className = "section-label";
    heading.textContent = label;
    const content = document.createElement("div");
    content.className = className;
    content.textContent = text;
    section.append(heading, content);
    tooltipBody.append(section);
  }

  function addTooltipMeta(node) {
    const values = [
      ["類型", node.node_type_zh],
      ["分支", node.branch_zh],
      ["圖示", node.icon_name],
      ["最高等級", node.max_rank ? `${node.max_rank}` : ""],
    ].filter(([, value]) => value !== undefined && value !== null && String(value) !== "");
    if (!values.length) return;
    const section = document.createElement("section");
    section.className = "tooltip-section";
    const heading = document.createElement("p");
    heading.className = "section-label";
    heading.textContent = "節點資料";
    const grid = document.createElement("div");
    grid.className = "tooltip-meta-grid";
    values.forEach(([label, value]) => {
      const chip = document.createElement("div");
      chip.className = "meta-chip";
      const chipLabel = document.createElement("span");
      chipLabel.className = "meta-chip-label";
      chipLabel.textContent = label;
      const chipValue = document.createElement("span");
      chipValue.className = "meta-chip-value";
      chipValue.textContent = formatValue(value);
      chip.append(chipLabel, chipValue);
      grid.append(chip);
    });
    section.append(heading, grid);
    tooltipBody.append(section);
  }

  function addTooltipCosts(node) {
    const gold = listToText(node.gold_costs);
    const core = listToText(node.core_costs);
    if (!gold && !core) return;
    const section = document.createElement("section");
    section.className = "tooltip-section";
    const heading = document.createElement("p");
    heading.className = "section-label";
    heading.textContent = "解鎖／強化成本";
    const costs = document.createElement("div");
    costs.className = "tooltip-costs";
    if (gold) {
      const pill = document.createElement("span");
      pill.className = "cost-pill";
      pill.textContent = `金幣 ${gold}`;
      costs.append(pill);
    }
    if (core) {
      const pill = document.createElement("span");
      pill.className = "cost-pill";
      pill.textContent = `核心 ${core}`;
      costs.append(pill);
    }
    section.append(heading, costs);
    tooltipBody.append(section);
  }

  function renderTooltip(node) {
    tooltipKicker.textContent = `${formatValue(node.branch_zh)} · ${formatValue(node.node_type_zh)}`;
    tooltipTitle.textContent = formatValue(node.name_zh, "未命名節點");
    tooltipBody.replaceChildren();
    addTooltipSection("遊戲內說明", node.description_zh);
    addTooltipSection("覺醒／局內效果", node.dice_awaken);
    addTooltipSection("解鎖條件", node.unlock_condition_zh);
    addTooltipCosts(node);
    addTooltipMeta(node);

    const attack = [node.dice_attack && `攻擊 ${node.dice_attack}`, node.dice_attack_interval && `攻擊間隔 ${node.dice_attack_interval}`]
      .filter(Boolean)
      .join(" · ");
    addTooltipSection("基礎數值", attack);
  }

  function positionTooltip(nodeId) {
    const element = state.elementsById.get(nodeId);
    if (!element || tooltip.hidden) return;
    const target = element.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const margin = 14;
    const candidates = [
      { left: target.right + margin, top: target.top + target.height / 2 - height / 2 },
      { left: target.left - width - margin, top: target.top + target.height / 2 - height / 2 },
      { left: target.left + target.width / 2 - width / 2, top: target.bottom + margin },
      { left: target.left + target.width / 2 - width / 2, top: target.top - height - margin },
    ];
    const fits = candidates.find((candidate) => (
      candidate.left >= margin &&
      candidate.top >= margin &&
      candidate.left + width <= window.innerWidth - margin &&
      candidate.top + height <= window.innerHeight - margin
    ));
    const chosen = fits || candidates[0];
    const left = Math.max(margin, Math.min(window.innerWidth - width - margin, chosen.left));
    const top = Math.max(margin, Math.min(window.innerHeight - height - margin, chosen.top));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function showTooltip(nodeId, pinned = false) {
    const node = state.nodeById.get(nodeId);
    if (!node) return;
    state.selectedId = nodeId;
    state.tooltipPinned = pinned;
    state.elementsById.forEach((element, id) => element.classList.toggle("is-selected", id === nodeId));
    renderTooltip(node);
    tooltip.classList.toggle("is-pinned", pinned);
    tooltip.hidden = false;
    window.cancelAnimationFrame(state.tooltipFrame);
    state.tooltipFrame = requestAnimationFrame(() => positionTooltip(nodeId));
  }

  function closeTooltip() {
    state.selectedId = null;
    state.tooltipPinned = false;
    tooltip.classList.remove("is-pinned");
    tooltip.hidden = true;
    state.elementsById.forEach((element) => element.classList.remove("is-selected"));
  }

  function handleHover(nodeId) {
    state.hoveredId = nodeId;
    const element = state.elementsById.get(nodeId);
    element?.classList.add("is-hovered");
    if (!state.tooltipPinned) showTooltip(nodeId, false);
  }

  function handleLeave(nodeId) {
    state.elementsById.get(nodeId)?.classList.remove("is-hovered");
    if (state.hoveredId === nodeId) state.hoveredId = null;
    if (!state.tooltipPinned && state.selectedId === nodeId) closeTooltip();
  }

  function renderSearchResults() {
    searchResults.replaceChildren();
    if (!searchInput.value.trim() || !state.matches.length) {
      searchResults.hidden = true;
      return;
    }
    searchResults.hidden = false;
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
      title.textContent = formatValue(node.name_zh);
      const meta = document.createElement("span");
      meta.className = "search-result-meta";
      meta.textContent = `${formatValue(node.branch_zh)} · ${formatValue(node.node_type_zh)}`;
      copy.append(title, meta);
      button.append(dot, copy);
      button.addEventListener("click", () => chooseSearchResult(node.id));
      searchResults.append(button);
    });
  }

  function chooseSearchResult(nodeId) {
    searchResults.hidden = true;
    const node = state.nodeById.get(nodeId);
    if (!node) return;
    showTooltip(nodeId, true);
    centerOnNode(nodeId, true);
    state.elementsById.get(nodeId)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }

  function applySearch(query) {
    const normalized = query.trim().toLocaleLowerCase("zh-Hant-TW");
    state.resultIndex = normalized ? 0 : -1;
    state.matches = normalized
      ? state.nodes.filter((node) => node._searchText.includes(normalized))
      : [];
    scene.classList.toggle("has-search", Boolean(normalized));
    state.elementsById.forEach((element, id) => element.classList.toggle("is-match", state.matches.some((node) => node.id === id)));
    searchClear.hidden = !normalized;
    if (!normalized) {
      searchStatus.textContent = `${state.nodes.length} 個節點`;
      emptyState.hidden = true;
    } else if (!state.matches.length) {
      searchStatus.textContent = "找不到節點";
      emptyState.hidden = false;
    } else {
      searchStatus.textContent = `符合 ${state.matches.length} 個節點`;
      emptyState.hidden = true;
    }
    renderSearchResults();
  }

  function chooseResultByKeyboard() {
    const node = state.matches[state.resultIndex];
    if (node) chooseSearchResult(node.id);
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
      chooseResultByKeyboard();
      return;
    }
    if (event.key === "Escape") {
      searchResults.hidden = true;
    }
  }

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
    state.pinch = {
      distance: pointerDistance(a, b),
      scale: state.scale,
      mapX: (center.x - rect.left - state.panX) / state.scale,
      mapY: (center.y - rect.top - state.panY) / state.scale,
    };
    state.drag = null;
    viewport.classList.remove("is-dragging");
  }

  function onViewportPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (state.pointers.size === 2) {
      startPinch();
      event.preventDefault();
      return;
    }
    state.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: state.panX,
      panY: state.panY,
      moved: false,
    };
  }

  function onViewportPointerMove(event) {
    if (!state.pointers.has(event.pointerId)) return;
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (state.pointers.size === 2 && state.pinch) {
      const points = [...state.pointers.values()];
      const [a, b] = points;
      const distance = pointerDistance(a, b);
      const center = pointerCenter(a, b);
      const rect = viewport.getBoundingClientRect();
      state.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, state.pinch.scale * (distance / state.pinch.distance)));
      state.panX = center.x - rect.left - state.pinch.mapX * state.scale;
      state.panY = center.y - rect.top - state.pinch.mapY * state.scale;
      setTransform();
      event.preventDefault();
      return;
    }
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.drag.startX;
    const dy = event.clientY - state.drag.startY;
    if (!state.drag.moved && Math.hypot(dx, dy) < 4) return;
    state.drag.moved = true;
    viewport.classList.add("is-dragging");
    scene.classList.remove("is-animating");
    state.panX = state.drag.panX + dx;
    state.panY = state.drag.panY + dy;
    setTransform();
    interactionStatus.textContent = "拖曳移動視野";
    event.preventDefault();
  }

  function onViewportPointerUp(event) {
    state.pointers.delete(event.pointerId);
    if (state.pointers.size < 2) state.pinch = null;
    if (!state.pointers.size) {
      state.drag = null;
      viewport.classList.remove("is-dragging");
    }
  }

  function onViewportWheel(event) {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0016);
    setZoom(state.scale * factor, event.clientX, event.clientY);
  }

  function onMinimapClick(event) {
    const rect = minimap.getBoundingClientRect();
    const mapX = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const mapY = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
    const { width, height } = viewportSize();
    state.panX = width / 2 - mapX * state.scale;
    state.panY = height / 2 - mapY * state.scale;
    setTransform({ animate: true });
    interactionStatus.textContent = "已從小地圖移動視野";
  }

  function wireNodes() {
    scene.querySelectorAll("g.node[data-node-id]").forEach((element) => {
      const nodeId = element.dataset.nodeId;
      const node = state.nodeById.get(nodeId);
      state.elementsById.set(nodeId, element);
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", `${formatValue(node?.name_zh, "節點")}，${formatValue(node?.node_type_zh, "骰子樹節點")}`);
      element.addEventListener("pointerenter", () => handleHover(nodeId));
      element.addEventListener("pointerleave", () => handleLeave(nodeId));
      element.addEventListener("click", (event) => {
        if (state.drag?.moved) {
          event.preventDefault();
          return;
        }
        showTooltip(nodeId, true);
        interactionStatus.textContent = "提示框已固定；按 Esc 或 × 關閉";
      });
      element.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        showTooltip(nodeId, true);
        interactionStatus.textContent = "提示框已固定；按 Esc 或 × 關閉";
      });
    });
  }

  function connectControls() {
    $("#zoom-in").addEventListener("click", () => setZoom(state.scale * 1.22, null, null, true));
    $("#zoom-out").addEventListener("click", () => setZoom(state.scale / 1.22, null, null, true));
    $("#zoom-reset").addEventListener("click", () => {
      state.scale = 1;
      const { width, height } = viewportSize();
      state.panX = (width - MAP_WIDTH) / 2;
      state.panY = (height - MAP_HEIGHT) / 2;
      setTransform({ animate: true });
      interactionStatus.textContent = "已重設為 100%";
    });
    $("#zoom-fit").addEventListener("click", () => fitToViewport(true));
    $("#tooltip-close").addEventListener("click", closeTooltip);
    searchInput.addEventListener("input", () => applySearch(searchInput.value));
    searchInput.addEventListener("keydown", onSearchKeydown);
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      applySearch("");
      searchInput.focus();
    });
    viewport.addEventListener("pointerdown", onViewportPointerDown);
    viewport.addEventListener("pointermove", onViewportPointerMove, { passive: false });
    viewport.addEventListener("pointerup", onViewportPointerUp);
    viewport.addEventListener("pointercancel", onViewportPointerUp);
    viewport.addEventListener("wheel", onViewportWheel, { passive: false });
    viewport.addEventListener("click", (event) => {
      if (!event.target.closest(".node") && state.tooltipPinned) closeTooltip();
    });
    minimap.addEventListener("click", onMinimapClick);
    window.addEventListener("resize", () => {
      clampPan();
      scheduleTransform();
      if (!tooltip.hidden && state.selectedId) positionTooltip(state.selectedId);
    });
    window.addEventListener("keydown", (event) => {
      const editingText = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (editingText && event.key !== "Escape") return;
      if (event.key === "/" && document.activeElement !== searchInput) {
        event.preventDefault();
        searchInput.focus();
      } else if (event.key === "Escape") {
        closeTooltip();
        searchResults.hidden = true;
      } else if (event.key === "+" || event.key === "=") {
        setZoom(state.scale * 1.22, null, null, true);
      } else if (event.key === "-" || event.key === "_") {
        setZoom(state.scale / 1.22, null, null, true);
      } else if (event.key === "0") {
        $("#zoom-reset").click();
      }
    });
  }

  async function loadMap() {
    try {
      const [dataResponse, svgResponse] = await Promise.all([fetch(DATA_URL), fetch(SVG_URL)]);
      if (!dataResponse.ok || !svgResponse.ok) throw new Error("資料檔案無法載入");
      const data = await dataResponse.json();
      const svgText = await svgResponse.text();
      state.nodes = (data.nodes || []).map((node) => ({ ...node, _searchText: nodeSearchText(node) }));
      state.nodeById = new Map(state.nodes.map((node) => [node.id, node]));
      scene.innerHTML = svgText;
      scene.setAttribute("aria-hidden", "false");
      scene.querySelector("svg")?.setAttribute("aria-label", "Random Dice 2 骰子樹完整地圖");
      wireNodes();
      connectControls();
      loading.hidden = true;
      searchStatus.textContent = `${state.nodes.length} 個節點`;
      fitToViewport(false);
      window.setTimeout(() => fitToViewport(false), 80);
    } catch (error) {
      console.error(error);
      loading.hidden = true;
      errorState.hidden = false;
    }
  }

  loadMap();
})();
