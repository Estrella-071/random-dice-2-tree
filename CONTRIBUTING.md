# 貢獻指南

本專案維護一個有版本邊界的 Random Dice 2 client 1.0.0 資料快照與靜態網站。貢獻的價值取決於可驗證證據、可重現命令與清楚的授權範圍，而不是宣稱「最新」或「完整」。

開始前請閱讀 [AGENTS.md](AGENTS.md)、[DATA_MODEL.md](DATA_MODEL.md)、[TESTING.md](TESTING.md) 與 [NOTICE.md](NOTICE.md)。

## 可接受的貢獻

- 有來源與版本證據的數值、文字、圖示勘誤。
- 可由測試或人工步驟驗證的 UI、手機 viewport、效能或可及性改進。
- 資料 schema、生成流程、研究可重現性與治理文件改善。
- 不擴大未確認第三方素材散布範圍的網站功能。

不要提交 IPA、原始解包輸出、私人 artifact、個人絕對路徑、秘密或未確認授權的第三方素材。[NOTICE.md](NOTICE.md) 說明程式碼與遊戲衍生資料的授權邊界。

## 資料修正

Issue 或 PR 必須提供：

- 節點 ID、名稱、目前值與建議值，包含單位與階級。
- client 版本、平台、區域、語言與觀察日期。
- 截圖、官方公告、遊戲內證據或可重現計算。
- 影響範圍與信心等級；無法證明的內容標為未驗證。

canonical 資料在 `site/data/dice_tree.json`。修改後不可直接手改生成檔：

```bash
npm run generate:data
npm run validate
npm run build:pages
```

## 程式碼與文件 PR

```bash
git checkout -b fix/short-description
npm ci
npm run validate
npm run build:pages
npm run setup:browser
npm run test:browser
```

PR 描述請填寫模板中的影響範圍、證據、命令與未覆蓋 gate。UI 變更至少說明桌面與 390×844 mobile viewport；資料變更必須說明 snapshot 版本。研究腳本若無法從 clean clone 執行，應放在研究範圍並在文件中標示依賴與輸入限制。

## Review gate

Reviewer 會確認：

1. `npm run validate` 與 `npm run build:pages` 通過。
2. 生成檔與 canonical source 沒有漂移。
3. 變更沒有引入 dead link、未列入 allowlist 的部署檔或個人路徑。
4. 資料來源、版本、授權與安全影響可追溯。
5. UI 變更沒有明顯鍵盤、手機、效能或既有互動回歸。

## Commit

建議使用 Conventional Commits，例如 `fix(data): correct node 4307 cost`、`feat(ui): improve tooltip navigation`、`docs: clarify snapshot provenance`。commit 訊息不能取代 PR 證據與測試結果。
