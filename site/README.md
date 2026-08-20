# Site runtime

`site/` 是 GitHub Pages 的靜態網站來源。公開部署不會直接上傳整個目錄，而是由根目錄的 `npm run build:pages` 依 [runtime-allowlist.json](runtime-allowlist.json) 產生 staging。

## Runtime assets

- `index.html`、`app.js`、`styles.css`、`favicon.svg`
- `data/tree_data.js`、`data/tree_svg.js`：瀏覽器預載的生成檔
- allowlist 中的 `icons/*.png`：tooltip 統計與骰子圖示

網站部署時使用 JS 預載資料；canonical `data/dice_tree.json` 與 `data/dice_tree.svg` 保留在 repository，供研究、生成與 fallback 驗證使用，但不再重複放入 Pages artifact。這四個資料檔必須由 `npm run generate:data` 保持一致，不應只改其中一份。

Google Fonts 是外部可選依賴；失去網路時網站仍應使用系統字型。網站沒有帳號或後端資料，所有公開資料都屬版本化靜態快照。

## Local preview

從 repository 根目錄執行：

```bash
npm ci
npm run validate
npm run build:pages
npm run setup:browser
python -m http.server 3000 --directory site
```

瀏覽器 smoke suite 請執行 `npm run test:browser`；它會自行使用 loopback port，並把截圖寫入被忽略的 `artifacts/verify-suite/`。完整測試範圍請看 [TESTING.md](../TESTING.md)。

## Data and legal scope

資料版本、branch map、節點契約與研究限制請看 [DATA_MODEL.md](../DATA_MODEL.md)、[REPRODUCING.md](../REPRODUCING.md) 與 [NOTICE.md](../NOTICE.md)。網站是非官方社群專案；遊戲衍生素材與商標不因根目錄 MIT 而取得第三方再散布權。
