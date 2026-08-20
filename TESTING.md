# 測試規範

## 必跑檢查

```bash
npm ci
npm run validate
npm run build:pages
npm run setup:browser
npm run test:browser
```

`validate` 包含資料結構、節點邊、icon 路徑、生成檔一致性與追蹤文件相對連結檢查。`build:pages` 會重建部署 staging 並檢查 allowlist 中的每個檔案。

## Browser smoke scope

Browser suite 覆蓋 file/http 載入、樹節點互動、tooltip、篩選、縮放、拖曳、手機 viewport、免責 widget 與 loading state。它不是完整的 screen-reader、鍵盤、真機、跨瀏覽器、效能或部署驗證。

CI 會先建立 `.pages/`，再以 `VERIFY_SITE_DIR=.pages` 對實際 Pages staging 執行 smoke suite；本機若要驗證部署 artifact，可先執行 `npm run build:pages`，再設定同名環境變數執行 `npm run test:browser`。

## PR 要求

- 資料或生成檔變更：附上資料版本、來源、變更摘要與驗證命令。
- UI 變更：說明桌面與手機 viewport 的結果；必要時附本地截圖，但不要提交私人路徑。
- 安全或第三方素材變更：依 [SECURITY.md](SECURITY.md) 與 [NOTICE.md](NOTICE.md) 說明影響。
