# 維護與審核政策

## 分支與合併

- `main` 只接受 Pull Request；可部署變更經過 review 後合併。
- PR 會通過 `Validate project / Static data/docs validation` 與 `Validate project / Chromium smoke suite`。文件-only、研究-only 變更使用成功的 browser scope-skip；runtime、資料與資產變更會安裝 Chromium。
- 一般 PR 至少需要一位 reviewer。涉及 runtime、資料、素材、公開 provenance、CI、腳本、法律或安全的路徑，再由 [CODEOWNERS](.github/CODEOWNERS) 維護者審核。根目錄純文件、錯字與 issue template 走一般審查流程。
- `deploy` 只在同一個 `ci.yml` workflow 的 static 與 browser jobs 成功後下載 verified `.pages` artifact。branch protection、required status checks、conversation resolution 與 force-push policy 由 GitHub repository settings 管理，維護者需在該處確認設定。
- 維護者設定 required checks 時，名稱請與 workflow job 保持一致：`Validate project / Static data/docs validation`、`Validate project / Chromium smoke suite`。GitHub UI 顯示名稱若有變更，也請同步更新本文件與部署說明。

## 版本與資料發布

每次公開資料更新應記錄：

- client 版本、平台、區域/語言與觀察日期
- 輸入與公開輸出的 SHA-256 provenance
- 節點、邊、補充資料與資產 inventory 的差異
- 測試結果、未覆蓋 gate 與第三方素材授權狀態

正式 release 應建立 Git tag、GitHub release notes 與對應的資料快照。尚未建立 tag 的版本標記為 `Unreleased`。

## 衝突處理

數值證據衝突時，優先採用可重現、版本相同且來源清楚的證據。證據不足時保留 issue 為未決，暫不修改現有資料。第三方權利要求優先於功能需求，相關檔案先隔離再處理。

## 貢獻者權利聲明

目前 repository 沒有另行要求 DCO 或 CLA；提交 PR 即表示貢獻者有權提交所提供的原始程式碼與文件，並已標示任何第三方內容。若未來採用 DCO/CLA，必須先更新本文件、PR 模板與合併規則。
