# AI 與自動化工作指引

本文件提供 AI 與自動化工具的工作說明。開始修改前，請閱讀本文件、[CONTRIBUTING.md](CONTRIBUTING.md) 與相關模組文件。

## Repository 邊界

- 本 repository 是網站原始碼與部署設定；Git、npm、CI 與 Pages 命令都從 repository 根目錄執行。
- 遠端 repository 的根目錄就是本 repository 的內容，不應再包一層同名網站目錄。
- 解包工具、研究輸入、原始 IPA、ZIP、研究輸出、私人 artifact、一次性截圖與個人路徑都不屬於本 repository；它們不得成為網站 build/test/deploy 的隱性依賴。
- clean clone 只負責網站資料、驗證、build、test 與 deploy；外部研究流程不屬於本 repository 的 CI 範圍。
- `site/data/dice_tree.json` 與 `site/data/dice_tree.svg` 是資料來源；`tree_data.js` 與 `tree_svg.js` 是由 `npm run generate:data` 產生的瀏覽器預載檔。
- `data/provenance.json` 與 `data/asset-inventory.json` 是網站 repository 內唯一保留的公開 snapshot／資產 metadata；不要把完整研究目錄移回 `data/`。
- `site/runtime-allowlist.json` 是 Pages 部署檔案的審核清單。部署時只使用清單列出的檔案。
- 遊戲美術、文字、資料與商標可能屬第三方；先確認授權，再決定素材的保存、散布與撤下方式。MIT 適用範圍以各檔案說明為準。

## 允許的 repository 內容

正常 tracked 範圍只有：

- `site/`、`scripts/`、`schema/`、`data/`；
- 根目錄的網站文件、治理文件、`package.json`／lockfile、`verify_suite.mjs`；
- `.github/` workflow、template、CODEOWNERS。

若看到 IPA／ZIP、原始解包檔、研究輸出、`node_modules/`、`.pages/`、`artifacts/` 或一次性輸出出現在 `git status`，應立即停止並移出 repository；不要用修改 allowlist 或 `.gitignore` 來掩蓋錯誤的 tracked 檔案。

## 修改規則

1. 先確認資料版本、來源、證據與影響範圍；版本資訊請使用具體版本與日期。
2. 修改 JSON 後必須執行 `npm run generate:data`，再執行 `npm run validate`。
3. 修改 runtime 檔案後必須執行 `npm run build:pages`，確認 staging 只包含 allowlist 檔案。
4. PR 只提交專案檔案；個人絕對路徑、截圖工具工作目錄、秘密、IPA、原始解包輸出與未審核生成檔留在本機。
5. 資料修正需保留來源版本、日期、區域/語言與可重現證據；證據不足時標註為未驗證。
6. 任何可能改變第三方素材公開散布範圍的動作，先暫停並請維護者確認法律與來源決策。

## 變更後的邊界檢查

```bash
git status --short --branch
git ls-files | rg '(\.ipa|\.zip)$|(^|/)(node_modules|\.pages|artifacts|outputs)(/|$)'
npm run validate
npm run build:pages
npm run test:browser
```

`git ls-files` 的邊界檢查必須沒有輸出；外部研究資料應在 repository 之外檢查，絕不加入 Git。

## 驗收命令

```bash
npm ci
npm run audit:deps
npm run setup:browser
npm run verify
```

`verify` 會以 `.pages/` staging 執行 Chromium smoke suite；無障礙、裝置、效能與法律驗證請另外安排。使用自動化工具修改 repository 時，請在 PR 描述中列出尚待測試的項目。
