# 貢獻指南

本專案維護 Random Dice 2 client 1.0.0 的資料快照與靜態網站。提交修改時，請附上能說明內容的版本、來源與驗證方式，讓其他人容易理解、重現與審查。

一般貢獻者閱讀本文件、[DATA_MODEL.md](DATA_MODEL.md)、[TESTING.md](TESTING.md) 與 [NOTICE.md](NOTICE.md) 即可。`AGENTS.md` 是 AI 與自動化工具使用的工作說明。

## 可接受的貢獻

- 有來源與版本證據的數值、文字、圖示勘誤。
- 可由測試或人工步驟驗證的 UI、手機 viewport、效能或可及性改進。
- 資料 schema、生成流程、研究可重現性與治理文件改善。
- 使用現有、已列入範圍的第三方素材，並遵守其授權與下架要求。

請將 IPA、原始解包輸出、私人 artifact、個人絕對路徑與秘密留在本機；PR 只提交已確認可公開的程式碼、文件與素材。[NOTICE.md](NOTICE.md) 說明遊戲衍生資料的授權邊界。

## 最短流程

請從變更類型對照表選擇檢查流程。文件與研究變更可以略過瀏覽器安裝：

| 變更類型 | 本機檢查 | CI 會做什麼 |
| --- | --- | --- |
| 文件、README、issue/PR template | `npm run check:docs` | 靜態檢查文件；瀏覽器 job 會記錄成功的 scope skip |
| 資料或生成檔 | `npm run generate:data`、`npm run validate`、`npm run build:pages` | 完成靜態檢查；`site/` 資料變更會再跑瀏覽器測試 |
| icon 或其他 runtime 資產 | `npm run audit:assets`、檢查清單後再 `node scripts/build_pages.mjs --write-allowlist`、`npm run verify` | 完成靜態檢查與瀏覽器測試 |
| `site/` UI、`scripts/` runtime/build 或測試 | `npm run verify` | 完成靜態檢查與瀏覽器測試 |
| 依賴或 lockfile | `npm run audit:deps`、`npm run verify` | 完成靜態檢查與瀏覽器測試 |
| 公開資料 provenance | `npm run check:provenance`、`npm run validate` | 完成靜態檢查；瀏覽器 job 會記錄 scope skip |
| 安全或授權疑慮 | 依 [SECURITY.md](SECURITY.md) 私下回報 | 使用私下管道處理 exploit、秘密或受爭議素材 |

CODEOWNERS 目前涵蓋 runtime、公開資料 provenance、CI、腳本、schema 與法律/安全文件。根目錄 README、一般文件、錯字與 issue template 走一般審查流程；高風險路徑由維護者審核。

UI/runtime 驗證需要 Chromium；文件-only PR 直接執行 `npm run check:docs`：

```bash
npm ci
npm run setup:browser
npm run verify
```

CI 在 Ubuntu 會另外安裝系統相依套件：`npx playwright install --with-deps chromium`；Windows/macOS 貢獻者使用 `npm run setup:browser` 即可。

## 資料修正

Issue 或 PR 必須提供：

- 節點 ID、名稱、目前值與建議值，包含單位與階級。
- client 版本、平台、區域、語言與觀察日期。
- 截圖、官方公告、遊戲內證據或可重現計算。
- 影響範圍與信心等級；證據不足時請標為未驗證。

canonical 資料位於 `site/data/dice_tree.json`。請從來源檔修改，再用下列命令更新生成檔：

```bash
npm run generate:data
npm run validate
npm run build:pages
```

若新增、刪除或替換 `site/icons/` PNG，先執行 `npm run audit:assets` 更新 [asset inventory](data/asset-inventory.json)。allowlist 有變化時，檢查清單後再執行 `node scripts/build_pages.mjs --write-allowlist`，最後重新驗證。allowlist 只放已使用且有 provenance 的 runtime 素材；extraction dump 請留在 repository 外部的研究 workspace。

## 程式碼與文件 PR

文件-only PR 使用上方的 `npm run check:docs`。runtime、腳本、測試或依賴變更使用以下完整流程：

```bash
git checkout -b fix/short-description
npm ci
npm run verify
```

PR 描述填寫與變更類型相關的影響範圍、證據、命令與尚待測試項目。UI 變更請說明桌面與 390×844 mobile viewport；資料變更請說明 snapshot 版本。本 repository 不接受解包研究腳本；研究工具與輸入請在外部研究 workspace 管理。

## 審查項目

維護者會確認：

1. 文件-only PR 通過 `npm run check:docs`；資料、runtime、腳本或依賴變更依適用流程通過 `npm run validate`、`npm run build:pages` 與瀏覽器測試。
2. 生成檔與來源檔保持同步。
3. 處理 `check:docs` 回報的本地失效連結、部署 allowlist 與個人路徑；外部網址另行人工確認。
4. 資料來源、版本、授權與安全影響可追溯。
5. UI 變更沒有明顯鍵盤、手機、效能或既有互動回歸。

## Commit

建議使用 Conventional Commits，例如 `fix(data): correct node 4307 cost`、`feat(ui): improve tooltip navigation`、`docs: clarify snapshot provenance`。commit 訊息用來摘要變更；PR 仍請附上證據與測試結果。
