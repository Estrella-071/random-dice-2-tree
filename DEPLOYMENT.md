# 部署與回滾

GitHub Pages 由 `.github/workflows/pages.yml` 部署。workflow 會先安裝 lockfile 依賴、執行 `npm run validate`，再以 `npm run build:pages` 建立 `.pages/`，最後只上傳 allowlist 檔案。

部署前必須確認：

1. CI 的 static 與 browser jobs 均通過。
2. `site/runtime-allowlist.json` 沒有未審核的檔案。
3. 生成資料與 canonical JSON/SVG 一致。
4. Pages artifact 不含研究輸入、測試輸出、nested workflow 或本機文件。

若部署後出現回歸，先停用或回退造成問題的 PR，保留上一個可驗證 commit；不要直接在 `main` 上手動覆蓋 artifact。

`site/index.html` 提供頁面層級的 CSP 與 referrer policy；GitHub Pages repository 本身不能設定所有 HTTP response headers。正式站仍需人工確認實際 CSP、HSTS、X-Content-Type-Options、Permissions-Policy 與第三方字型請求，不能把本地 smoke 結果當成 live header 證明。
