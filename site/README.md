# Site runtime

`site/` 是 GitHub Pages 的靜態網站來源。部署流程會依 [runtime-allowlist.json](runtime-allowlist.json) 挑選檔案，由根目錄的 `npm run build:pages` 產生 staging，再將這份 staging 發布。

## 網站檔案

- `index.html`、`app.js`、`styles.css`、`favicon.svg`
- `data/tree_data.js`、`data/tree_svg.js`：瀏覽器預載的生成檔
- allowlist 中的 `icons/*.png`：tooltip 統計與骰子圖示

網站部署時使用 JS 預載資料。canonical `data/dice_tree.json` 與 `data/dice_tree.svg` 留在 repository，供研究、生成與 fallback 驗證使用；Pages artifact 只需預載檔。四個資料檔請透過 `npm run generate:data` 同步。

Google Fonts 是外部可選依賴；失去網路時網站仍應使用系統字型。網站沒有帳號或後端資料，所有公開資料都屬版本化靜態快照。

## 本機預覽

從 repository 根目錄執行：

```bash
npm ci
npm run setup:browser
npm run verify
python -m http.server 3000 --bind 127.0.0.1 --directory .pages
```

`npm run verify` 會先驗證並建立 `.pages/`，再以 loopback port 執行瀏覽器 smoke suite；截圖會寫入被忽略的 `artifacts/verify-suite/`。用 `python -m http.server 3000 --bind 127.0.0.1 --directory .pages` 可預覽這份 staging。完整測試範圍與變更分流請看 [TESTING.md](../TESTING.md)。

## 資料與授權範圍

資料版本、branch map、節點契約與研究限制請看 [DATA_MODEL.md](../DATA_MODEL.md)、[REPRODUCING.md](../REPRODUCING.md) 與 [NOTICE.md](../NOTICE.md)。這是非官方社群專案；遊戲衍生素材與商標的權利仍歸第三方，請依 NOTICE 的範圍使用。
