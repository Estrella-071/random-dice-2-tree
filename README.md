<div align="center">

# Random Dice 2 骰子天賦樹

### 繁體中文全節點資料庫與升階試算工具

[![開啟網站](https://img.shields.io/badge/Live-GitHub%20Pages-59449B?style=for-the-badge&logo=githubpages&logoColor=white)](https://estrella-071.github.io/random-dice-2-tree/)
[![CI](https://img.shields.io/github/actions/workflow/status/Estrella-071/random-dice-2-tree/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/Estrella-071/random-dice-2-tree/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/github/actions/workflow/status/Estrella-071/random-dice-2-tree/pages.yml?branch=main&style=for-the-badge&label=GitHub%20Pages)](https://github.com/Estrella-071/random-dice-2-tree/actions/workflows/pages.yml)
[![貢獻指南](https://img.shields.io/badge/Contributing-指南-22c55e?style=for-the-badge&logo=github)](CONTRIBUTING.md)
[![程式碼授權](https://img.shields.io/badge/Code-MIT-3b82f6?style=for-the-badge)](LICENSE)

收錄《Random Dice 2》五大派系的 239 個天賦節點、前置解鎖路徑與升階花費明細。

[開啟網頁版](https://estrella-071.github.io/random-dice-2-tree/) · [回報數值錯誤](https://github.com/Estrella-071/random-dice-2-tree/issues/new?template=data_correction.md) · [提出功能建議](https://github.com/Estrella-071/random-dice-2-tree/issues/new?template=feature_request.md) · [閱讀貢獻指南](CONTRIBUTING.md)

</div>

> [!WARNING]
> ### 非官方社群專案聲明
> 本專案是玩家社群製作的查詢網站，與 111 Percent Inc. 沒有商業關係，也未取得官方授權或背書。遊戲美術、骰子圖示、數值文案、商標與其他衍生資料可能屬於第三方權利人；根目錄的 MIT 授權只適用於相應的程式碼與文件。
>
> 專案以非營利的資料查詢、策略研究與社群校對為用途。素材授權、下架與安全問題，請分別參考 [NOTICE.md](NOTICE.md)、[權利人聯絡](#權利人聯絡rights-holder-contact) 與 [SECURITY.md](SECURITY.md)。

## 主要功能

本工具提供節點關聯查詢與數值試算功能：

- **前置路徑追溯**：點擊任一骰子、符文或被動節點，自動標記其前置解鎖路徑並淡化非相關分支。
- **升階花費明細**：呈現節點各階級的金幣、核心與累計消耗。
- **多維篩選與搜尋**：支援依派系與節點類型交叉篩選，以及關鍵字搜尋。
- **跨平台適配**：支援桌面浮動資訊卡、手機觸控手勢、縮放與自適應佈局。
- **全景小地圖**：提供縮圖導航與可視區域框，支援點擊跳轉與拖曳定位。
- **版本化資料快照**：保留 client 版本、來源、provenance 與生成檔同步關係。

## 專案範圍

目前公開的 `site/data/dice_tree.json` 來自 Random Dice 2 iOS client 1.0.0。網站內容以這個 snapshot 為準，與目前線上版本分開記錄。快照包含 239 個可視樹節點：41 顆骰子、123 個骰子符文、70 個玩家被動與 5 個支援特性；另有 30 筆 supplemental RuneTable 資料不直接計入可視樹節點。

資料來源、版本界線、第三方素材與撤下方式請看 [NOTICE.md](NOTICE.md)、[DATA_MODEL.md](DATA_MODEL.md) 與 [REPRODUCING.md](REPRODUCING.md)。更新資料時請標示 client 版本與證據，方便讀者判斷資料適用範圍。

## 五大派系收錄全覽

這張表適合用來快速找到分支；平衡性排名請以遊戲版本與各節點的來源說明為準。

| 派系 | 初始代表骰子 | 核心機制摘要 |
| :--- | :--- | :--- |
| **自然 (Nature)** | 火、尖刺、花、巨石、風、光、冰、毒 | 基礎攻擊、範圍牽制、週期效果與中毒層數 |
| **工學 (Engineering)** | 齒輪、地雷、霓虹、鋸齒、礦山、狙擊、雷射 | 機械連鎖、遠距離暴擊、能量與 SP 採集 |
| **魔法 (Magic)** | 電流、共鳴、魔彈、召喚、連擊、適應、煉金 | 連鎖閃電、共鳴增幅、合成次數與成長增益 |
| **秩序 (Order)** | 泡泡、鎖定、審判、成長、天譴、祝福、排序、和諧 | 控場、祝福加成、能量補充與和諧增幅 |
| **渾沌 (Chaos)** | 孤獨、恐懼、暴君、末日、變異、貪婪、吞噬、死神、腐敗 | 恐懼、腐敗、嗜血與全地圖斬殺效果 |

### Canonical 派系名稱

| branch | 名稱 | 說明 |
| ---: | --- | --- |
| 1 | 自然 | 自然分支 |
| 2 | 工學 | 機械與工程分支 |
| 3 | 魔法 | 魔法與元素分支 |
| 4 | 秩序 | 秩序分支 |
| 5 | 渾沌 | 渾沌分支 |

## 資料同步與版本邊界

本專案以可追溯的 client snapshot 為資料基準。資料修正或新增內容時，請同步記錄：

- client 版本、平台、區域/語言與觀察日期；
- 截圖、官方公告、遊戲內證據或可重現計算；
- 輸入與公開輸出的 SHA-256 provenance，以及節點、邊、資產 inventory 差異；
- 尚待測試的瀏覽器、裝置、無障礙、效能或授權項目。

`site/data/dice_tree.json` 與 `site/data/dice_tree.svg` 是 canonical source。請從這兩個檔案修改資料，再執行 `npm run generate:data` 更新 `tree_data.js` 與 `tree_svg.js`。Pages artifact 以 `site/runtime-allowlist.json` 列出的檔案為主，另附 build 產生的 `runtime-manifest.json`；研究輸出與未使用素材留在研究範圍。既有公開 Git history 的素材界線請看 [NOTICE.md](NOTICE.md)。

## 協作與數據校對

歡迎社群玩家共同維護與校對資料。

### 發現數值或文字錯誤

若發現天賦數值、花費、文字或圖示有誤，請使用[數值修正 Issue](https://github.com/Estrella-071/random-dice-2-tree/issues/new?template=data_correction.md)，提供節點 ID、目前內容、建議內容、snapshot 版本與證據。證據不足時請標記為「未驗證」，讓維護者保留原資料並追蹤後續線索。

### 提交修改 Pull Request

所有節點資料均以 `site/data/dice_tree.json` 與 `site/data/dice_tree.svg` 為來源。請先閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)，依文件、資料、runtime 或 security 變更類型執行對應流程。生成檔由工具更新；IPA、原始解包輸出、秘密、私人路徑與未審核第三方素材請留在 repository 外部的研究 workspace。

## 資料結構範例 (`dice_tree.json`)

每個 `nodes[]` 項目還有依節點類型而異的欄位；完整契約請看 [DATA_MODEL.md](DATA_MODEL.md) 與 [schema/dice-tree.schema.json](schema/dice-tree.schema.json)。以下是目前 snapshot 中的簡化範例：

```json
{
  "id": "1001",
  "branch": 1,
  "branch_zh": "自然",
  "node_type": "DICE",
  "name_zh": "火骰子",
  "incoming": [],
  "next_nodes": ["1109", "1007", "1005", "1201"],
  "icon_file": "icons/Dice_fire2.png",
  "max_rank": 1,
  "unlock_gold": 0,
  "unlock_core": 5
}
```

## 本機開發與預覽

網站使用原生 HTML、CSS 與 JavaScript，從 repository 根目錄即可啟動驗證與預覽：

```bash
git clone https://github.com/Estrella-071/random-dice-2-tree.git
cd random-dice-2-tree
npm ci
npm run audit:deps
npm run setup:browser
npm run verify
python -m http.server 3000 --bind 127.0.0.1 --directory .pages
```

`npm run verify` 會驗證資料、建立 allowlist staging，並以同一份 `.pages/` 執行 Chromium smoke suite；Python server 用來預覽這份輸出。開啟 `http://127.0.0.1:3000` 即可檢視。完整測試範圍、截圖輸出、平台差異與 clean-clone 限制請看 [TESTING.md](TESTING.md) 與 [REPRODUCING.md](REPRODUCING.md)。

## 資料修改流程

修改 `site/data/dice_tree.json` 或 `site/data/dice_tree.svg` 後執行：

```bash
npm run generate:data
npm run validate
npm run build:pages
```

若變更 `site/icons/`，請先檢查 asset inventory，再為已審核且具 provenance 的 runtime 素材更新 allowlist；具體順序請看 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 開發與治理文件

- [架構與資料流](ARCHITECTURE.md)
- [資料模型](DATA_MODEL.md)
- [重現流程](REPRODUCING.md)
- [測試規範](TESTING.md)
- [部署與回滾](DEPLOYMENT.md)
- [貢獻指南](CONTRIBUTING.md)
- [維護與審核政策](GOVERNANCE.md)
- [安全政策](SECURITY.md)
- [素材與資料 NOTICE](NOTICE.md)
- [AI 與自動化指引](AGENTS.md)（提供給自動化工具）

## 授權與權利人聯絡

- 資料以 client 版本快照發布；遊戲平衡性請查看對應版本的來源。
- smoke test 涵蓋自動化瀏覽器流程；無障礙、真機、跨瀏覽器、效能、正式部署與法律審查請另外安排。
- `site/icons/` 與 SVG 內的遊戲衍生素材依 [NOTICE.md](NOTICE.md) 的範圍與撤下政策處理；根目錄的 [MIT License](LICENSE) 僅涵蓋相應的程式碼與文件。
- 安全問題請依 [SECURITY.md](SECURITY.md) 私下回報；素材權利問題請使用下方聯絡方式。

### 權利人聯絡（Rights-holder contact）

> *If you are a representative of 111 Percent Inc. and would like any assets removed, please contact [`itsestrella71@gmail.com`](mailto:itsestrella71@gmail.com) and we will comply immediately.*
