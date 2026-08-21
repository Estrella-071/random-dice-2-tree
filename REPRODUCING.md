# 重現與資料來源

## 網站與驗證

環境需求：Node.js 20 以上、npm 10 以上。

```bash
git clone https://github.com/Estrella-071/random-dice-2-tree.git
cd random-dice-2-tree
npm ci
npm run audit:deps
npm run setup:browser
npm run verify
```

`npm run verify` 會自行啟動 loopback 的暫時 port；可用 `VERIFY_PORT` 指定 port，用 `VERIFY_ARTIFACT_DIR` 指定本地截圖輸出目錄。截圖與本機路徑留在本機即可。Ubuntu/CI 若缺少系統相依套件，使用 `npx playwright install --with-deps chromium`；Windows/macOS 使用 `npm run setup:browser`。

## 研究資料

解包工具、原始 IPA、解包目錄與研究輸出由外部研究 workspace 管理，不在本網站 repository，也不會被 Pages 部署。研究 workspace 的輸入與輸出需自行記錄合法來源、SHA-256、Python 版本、依賴 lock 與工具版本；資料不齊時請標為未驗證。

網站 repository 只保留公開快照的驗證 metadata：[data/provenance.json](data/provenance.json) 與 [data/asset-inventory.json](data/asset-inventory.json)。`npm run validate` 會檢查公開 JSON/SVG 的 SHA-256、節點/邊數與 runtime 資產清單。
