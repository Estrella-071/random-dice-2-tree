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

`.github/workflows/ci.yml` 的 `deploy` job 使用 `scripts/build_pages.mjs` 產生、並由 static/browser jobs 驗證的 `.pages/`。Pages artifact 只包含瀏覽器需要的 generated JS bundles、allowlist 檔案與 `runtime-manifest.json`；canonical JSON/SVG source 與公開 metadata 留在 repository，研究資料、測試截圖、一次性腳本與 extraction dump 留在外部研究 workspace。既有公開歷史的素材界線由 [NOTICE.md](NOTICE.md) 說明。
