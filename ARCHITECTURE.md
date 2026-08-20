# 架構與資料流

## Runtime

網站由 `site/index.html` 載入預先序列化的 `site/data/tree_data.js` 與 `site/data/tree_svg.js`，再啟動 `site/app.js`。若預載全域資料不存在，`app.js` 才會 fallback 讀取 `data/dice_tree.json` 與 `data/dice_tree.svg`。

網站使用內嵌 SVG sprite 渲染樹圖；tooltip 的部分統計圖示與骰子 3 系列圖示來自 `site/icons/`。Google Fonts 是可選的第三方網路依賴，離線時應退回系統字型。

## Source of truth

```text
site/data/dice_tree.json  ─┐
                           ├─ npm run generate:data ─> tree_data.js
site/data/dice_tree.svg   ─┘                         └> tree_svg.js
```

資料契約由 `schema/dice-tree.schema.json` 描述，結構與圖邊完整性由 `scripts/validate_data.mjs` 驗證。

## Deployment

`.github/workflows/pages.yml` 只會部署 `scripts/build_pages.mjs` 產生的 `.pages/`。canonical JSON/SVG source、研究資料、測試截圖、一次性腳本與未列入 allowlist 的素材不會進入 Pages artifact；未使用的 extraction dump 也不納入公開 Git tree。部署只帶瀏覽器需要的 generated JS bundles。
