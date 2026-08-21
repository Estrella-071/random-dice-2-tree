## 變更摘要

<!-- 說明使用者可觀察的行為或資料變更。請寫出具體內容。 -->

## 影響範圍

- [ ] site runtime
- [ ] dice-tree data
- [ ] generated artifacts
- [ ] published data/provenance
- [ ] governance/docs
- [ ] third-party assets or licensing

## 證據與驗證

- 資料版本 / client snapshot（資料或 provenance 變更時）：
- 來源、日期、區域/語言與證據（資料或第三方素材變更時）：
- 執行的相關命令（只勾選適用項目）：
  - [ ] 文件：`npm run check:docs`
  - [ ] 資料/生成檔：`npm run generate:data`、`npm run validate`
  - [ ] icon/asset：`npm run audit:assets`、`npm run build:pages`
  - [ ] runtime/UI/依賴：`npm run verify`
  - [ ] 公開資料：`npm run check:provenance`、`npm run validate`
  - [ ] 依賴變更：`npm run audit:deps`
  - [ ] 不適用（請說明原因）：
- 未覆蓋的 gate 或已知限制：

## 安全與授權確認

- [ ] PR 內容只包含可公開的程式碼、文件與測試結果；secrets、IPA、私人路徑與測試 artifact 留在本機
- [ ] 第三方素材維持現有部署範圍，或已在 `NOTICE.md` 記錄變更
- [ ] 若有安全/授權風險，已依 `SECURITY.md` / `NOTICE.md` 處理
