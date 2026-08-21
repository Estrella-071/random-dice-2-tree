# 測試規範

## 檢查分流

```bash
npm ci
npm run audit:deps
npm run setup:browser
npm run verify
```

上方命令適用於 runtime/UI 變更與完整 clean-clone 驗證。文件變更執行 `npm run check:docs`；公開資料 provenance 變更執行 `npm run check:provenance` 與 `npm run validate`；PNG 變更先執行 `npm run audit:assets`；依賴變更執行 `npm run audit:deps`。

`npm run verify` 依序執行 `validate`、`build:pages`，再以 `.pages/` staging 執行 browser suite。`validate` 會檢查資料結構、節點邊、icon 路徑、生成檔一致性、asset inventory 與追蹤文件的相對連結。

## 瀏覽器 smoke 測試範圍

Browser suite 覆蓋 file/http 載入、樹節點互動、tooltip、篩選、縮放、拖曳、手機 viewport、免責 widget 與 loading state。screen-reader、鍵盤、真機、跨瀏覽器、效能與部署需要另外測試。

CI 的 static job 會建立並上傳 `.pages/`，browser job 下載同一份 staging，再以 `VERIFY_SITE_DIR=.pages` 執行 smoke suite。文件-only 與公開 metadata-only PR 使用 scope skip 成功結束，外部研究 workspace 不屬於本 repository 的 CI 範圍。screen-reader、鍵盤、真機、跨瀏覽器、效能與部署請另外測試。

## PR 要求

- 資料或生成檔變更：附上資料版本、來源、變更摘要與驗證命令。
- UI 變更：說明桌面與手機 viewport 的結果；必要時附本地截圖，截圖檔請留在 `artifacts/`。
- 安全或第三方素材變更：依 [SECURITY.md](SECURITY.md) 與 [NOTICE.md](NOTICE.md) 說明影響。
