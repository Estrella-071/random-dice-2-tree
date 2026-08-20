# AI 與自動化工作指引

本文件是 repository 內的 AI context。任何自動化修改都必須先讀取本文件、[CONTRIBUTING.md](CONTRIBUTING.md) 與相關模組文件。

## 專案邊界

- `site/` 是可部署的純靜態網站；研究輸入、原始 IPA、解包輸出與一次性探勘檔案不是網站 runtime。
- `xlsx_build/` 是 optional artifact tooling，不是核心 build/test/deploy 依賴；除非另有 lock 與公開輸入契約，不得把它當成 clean-clone 必需步驟。
- `site/data/dice_tree.json` 與 `site/data/dice_tree.svg` 是資料來源；`tree_data.js` 與 `tree_svg.js` 是由 `npm run generate:data` 產生的瀏覽器預載檔。
- `site/runtime-allowlist.json` 是 Pages 部署檔案的審核清單。不要直接把整個 repository 或整個 `site/` 上傳。
- 遊戲美術、文字、資料與商標可能屬第三方；未確認授權前不得刪除、重新散布或宣稱 MIT 涵蓋它們。

## 修改規則

1. 先確認資料版本、來源、證據與影響範圍；不以「最新」或「完整」代替版本資訊。
2. 修改 JSON 後必須執行 `npm run generate:data`，再執行 `npm run validate`。
3. 修改 runtime 檔案後必須執行 `npm run build:pages`，確認 staging 只包含 allowlist 檔案。
4. 不得提交個人絕對路徑、截圖工具工作目錄、秘密、IPA、原始解包輸出或未審核的生成檔。
5. 資料修正需保留來源版本、日期、區域/語言與可重現證據；無法證明時標註為未驗證，而不是猜測。
6. 任何可能改變第三方素材公開散布範圍的動作，先停止並要求維護者確認法律與來源決策。

## 驗收命令

```bash
npm ci
npm run validate
npm run build:pages
npm run setup:browser
npm run test:browser
```

`test:browser` 是 Chromium smoke suite，不等同於完整的無障礙、裝置、效能或法律驗證；PR 必須在描述中列出未覆蓋的 gate。
