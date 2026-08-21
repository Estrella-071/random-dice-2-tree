# 部署與回滾

GitHub Pages 由 `.github/workflows/ci.yml` 的 `deploy` job 部署。`static` job 建立 `.pages/` 並完成靜態檢查，`browser` job 使用同一份 staging 執行 smoke suite；`deploy` 依賴這兩個 job 的成功結果。

`workflow_dispatch` 在 `main` ref 重新執行同一條驗證鏈；其他分支的手動執行只做驗證。部署一律使用 CI 產生的 Pages artifact。

部署前必須確認：

1. CI 的 static 與 browser jobs 均通過；deploy 直接使用已驗證的輸出。
2. `site/runtime-allowlist.json` 僅列出已審核的檔案。
3. 生成資料與 canonical JSON/SVG 一致。
4. Pages artifact 以 runtime allowlist 檔案為主，另含 build 產生的 `runtime-manifest.json`；研究輸入、測試輸出、nested workflow 與本機文件留在其他範圍。

若部署後出現回歸，先停用或回退造成問題的 PR，並保留上一個可驗證 commit。回滾也請透過 CI 產生 artifact。

`site/index.html` 提供頁面層級的 CSP 與 referrer policy；其他 HTTP response headers 由正式站環境另外管理。正式站仍需人工確認實際 CSP、HSTS、X-Content-Type-Options、Permissions-Policy 與第三方字型請求。本地 smoke 只涵蓋網站流程，live headers 與 branch protection、required checks、CODEOWNERS enforcement 請在 GitHub settings 另外確認。
