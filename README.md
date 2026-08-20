# Random Dice 2 骰子天賦樹

繁體中文的《Random Dice 2》骰子樹互動查詢與資料快照網站。

[![開啟網站](https://img.shields.io/badge/Live-GitHub%20Pages-59449B?style=for-the-badge&logo=githubpages&logoColor=white)](https://estrella-071.github.io/random-dice-2-tree/)
[![CI](https://img.shields.io/github/actions/workflow/status/Estrella-071/random-dice-2-tree/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/Estrella-071/random-dice-2-tree/actions/workflows/ci.yml)
[![貢獻指南](https://img.shields.io/badge/Contributing-指南-22c55e?style=for-the-badge&logo=github)](CONTRIBUTING.md)
[![程式碼授權](https://img.shields.io/badge/Code-MIT-3b82f6?style=for-the-badge)](LICENSE)

## 專案範圍

目前公開的 `site/data/dice_tree.json` 是從 Random Dice 2 iOS client 1.0.0 衍生的資料快照，不能視為目前線上版本或官方資料。快照包含 239 個可視樹節點：41 顆骰子、123 個骰子符文、70 個玩家被動與 5 個支援特性；另有 30 筆 supplemental RuneTable 資料不直接計入可視樹節點。

資料來源、版本邊界、第三方素材與撤下方式請看 [NOTICE.md](NOTICE.md)、[DATA_MODEL.md](DATA_MODEL.md) 與 [REPRODUCING.md](REPRODUCING.md)。本專案非 111 Percent Inc. 官方產品，也不宣稱得到官方授權或背書。

## 網站功能

- 點選節點後查看前置路徑、解鎖成本、階級與描述。
- 依派系與節點類型篩選，並支援關鍵字搜尋。
- 桌面與手機 viewport 的拖曳、縮放、導覽小地圖與 tooltip。
- 以內嵌 SVG 渲染樹圖，tooltip 使用 allowlist 中的統計與骰子圖示。

### Canonical 派系名稱

| branch | 名稱 | 說明 |
| ---: | --- | --- |
| 1 | 自然 | 自然分支 |
| 2 | 工學 | 機械與工程分支 |
| 3 | 魔法 | 魔法與元素分支 |
| 4 | 秩序 | 秩序分支 |
| 5 | 渾沌 | 渾沌分支 |

## 本機使用

需求：Node.js 20 以上、npm 10 以上。

```bash
git clone https://github.com/Estrella-071/random-dice-2-tree.git
cd random-dice-2-tree
npm ci
npm run validate
npm run build:pages
npm run setup:browser
python -m http.server 3000 --directory site
```

然後開啟 `http://localhost:3000`。瀏覽器 smoke suite 會自行建立 loopback 暫時 port，不要同時把另一個伺服器綁在測試 port：

```bash
npm run test:browser
```

完整命令、截圖輸出與 clean-clone 限制請看 [TESTING.md](TESTING.md) 與 [REPRODUCING.md](REPRODUCING.md)。

## 資料修改流程

`site/data/dice_tree.json` 與 `site/data/dice_tree.svg` 是 canonical source。修改後執行：

```bash
npm run generate:data
npm run validate
npm run build:pages
```

不要只修改 `tree_data.js` 或 `tree_svg.js`。它們是生成檔，CI 會檢查是否與來源一致。部署檔案由 `site/runtime-allowlist.json` 控制；研究輸出與未使用素材不納入公開 Git tree，也不會進入 Pages artifact。

數值勘誤必須附 client 版本、平台/區域/語言、觀察日期與截圖、官方公告或可重現計算等證據；請使用 [data correction issue](https://github.com/Estrella-071/random-dice-2-tree/issues/new?template=data_correction.md)。

## 開發與治理文件

- [AI 與自動化指引](AGENTS.md)
- [架構與資料流](ARCHITECTURE.md)
- [資料模型](DATA_MODEL.md)
- [重現流程](REPRODUCING.md)
- [測試規範](TESTING.md)
- [部署與回滾](DEPLOYMENT.md)
- [貢獻指南](CONTRIBUTING.md)
- [維護與審核政策](GOVERNANCE.md)
- [安全政策](SECURITY.md)
- [素材與資料 NOTICE](NOTICE.md)

## 限制

- 資料是版本化快照，不保證涵蓋最新遊戲平衡性。
- 網站 smoke test 不取代完整無障礙、真機、跨瀏覽器、效能或法律審查。
- `site/icons/` 與 SVG 內的遊戲衍生素材不因根目錄 MIT 而取得第三方授權；請遵守 [NOTICE.md](NOTICE.md) 的範圍與撤下政策。
