# 維護與審核政策

## 分支與合併

- `main` 只接受 Pull Request；不應直接推送可部署變更。
- PR 必須通過 `Validate project / Static data/docs validation` 與 `Validate project / Chromium smoke suite`。
- 需要至少一位 [CODEOWNERS](.github/CODEOWNERS) 維護者審核；資料、素材、法律或安全變更不得只由作者自審。
- GitHub repository settings 應啟用 branch protection、required status checks、conversation resolution 與禁止 force-push；這些是 repository 外部設定，不能只靠此文件宣稱已啟用。

## 版本與資料發布

每次公開資料更新應記錄：

- client 版本、平台、區域/語言與觀察日期
- 輸入與公開輸出的 SHA-256 provenance
- 節點、邊、補充資料與資產 inventory 的差異
- 測試結果、未覆蓋 gate 與第三方素材授權狀態

正式 release 應建立 Git tag、GitHub release notes 與對應的資料快照；沒有 tag 時只能稱為 `Unreleased`。

## 衝突處理

數值證據衝突時，以可重現、版本相同且來源清楚的證據為優先。無法判定時保留 issue 為未決，不用猜測值覆蓋現有資料。第三方權利要求優先於功能需求，相關檔案先隔離再處理。

## 貢獻者權利聲明

目前 repository 沒有另行要求 DCO 或 CLA；提交 PR 即表示貢獻者有權提交所提供的原始程式碼與文件，並已標示任何第三方內容。若未來採用 DCO/CLA，必須先更新本文件、PR 模板與合併規則。
