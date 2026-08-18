<div align="center">

# Random Dice 2 骰子天賦樹
### 繁體中文全節點資料庫與升階試算工具

[![線上開啟](https://img.shields.io/badge/線上開啟-點此進入-59449B?style=for-the-badge&logo=githubpages&logoColor=white)](https://estrella-071.github.io/random-dice-2-tree/)
[![歡迎協作](https://img.shields.io/badge/歡迎協作-貢獻指南-22c55e?style=for-the-badge&logo=github)](CONTRIBUTING.md)
[![授權條款](https://img.shields.io/badge/授權條款-MIT-3b82f6?style=for-the-badge)](LICENSE)
[![GitHub Pages](https://img.shields.io/github/actions/workflow/status/Estrella-071/random-dice-2-tree/pages.yml?style=for-the-badge&label=GitHub%20Pages)](https://estrella-071.github.io/random-dice-2-tree/)

<p align="center">
  收錄《Random Dice 2》五大派系全部 239 個天賦節點、前置解鎖路徑與升階花費明細。
</p>

[開啟網頁版](https://estrella-071.github.io/random-dice-2-tree/) | [回報數值錯誤](https://github.com/Estrella-071/random-dice-2-tree/issues/new?template=data_correction.md) | [提出功能建議](https://github.com/Estrella-071/random-dice-2-tree/issues/new?template=feature_request.md) | [貢獻指南](CONTRIBUTING.md)

---

</div>

> [!WARNING]
> ### 非官方社群專案聲明 (Unofficial Fan-made Project)
> - **非官方製作**：本專案為玩家社群自發建置之同人攻略工具與資料庫，與遊戲開發商 **111 Percent Inc.** 無任何商業隸屬、官方授權或背書關係。
> - **著作權宣告**：專案內引用之遊戲美術、骰子圖示、數值文案及相關商標之智慧財產權均屬 **111 Percent Inc.** 原權利人所有。
> - **純非營利原則**：本站恪守非營利（Non-commercial）原則，全站無廣告、無內購，僅供玩家戰術研討、數值試算與策略參考。
> - **DMCA 快速下架聯絡管道 (Takedown Contact)**：
>   > *If you are a representative of 111 Percent Inc. and would like any assets removed, please contact [`itsestrella71@gmail.com`](mailto:itsestrella71@gmail.com) and we will comply immediately.*

---

## 主要功能

本工具提供完整的節點關聯查詢與數值試算功能：

- **前置路徑追溯**：點擊任一骰子、符文或被動節點，自動標記其所有前置解鎖路徑，並淡化非相關分支。
- **升階花費明細**：完整呈現各節點從 1 階至滿階所需之金幣、核心與累計總消耗。
- **多維篩選與搜尋**：支援依派系（自然、工學、魔法、秩序、渾沌）與節點類型（骰子、符文、被動、支援）交叉篩選，並提供關鍵字搜尋。
- **跨平台適配**：支援電腦端浮動資訊卡與手機端觸控手勢、雙指縮放及自適應佈局。
- **全景小地圖**：提供縮圖導航與可視區域框，支援點擊跳轉與拖曳定位。

---

## 五大派系收錄全覽

全樹收錄 239 個天賦節點（骰子 41 顆、符文 123 個、玩家被動 70 個、支援特性 5 個）：

| 派系 | 初始代表骰子 | 核心機制說明 |
| :--- | :--- | :--- |
| **自然 (Nature)** | 火、尖刺、花、巨石、風、光、冰、毒 | 基礎攻擊力、範圍牽制、週期性暴風雪與中毒層數疊加 |
| **工學 (Engineering)** | 齒輪、地雷、霓虹、鋸齒、礦山、狙擊、雷射 | 機械連鎖傷害、遠距離暴擊、滿載能量射線與 SP 採集 |
| **魔法 (Magic)** | 電流、共鳴、魔彈、召喚、連擊、適應、煉金 | 連鎖閃電、魔像共鳴增幅、合成次數堆疊與成長增益 |
| **秩序 (Order)** | 泡泡、鎖定、審判、成長、天譴、祝福、排序、和諧 | 控場封印、傳說祝福加成、能量補充與和諧增幅 |
| **渾沌 (Chaos)** | 孤獨、恐懼、暴君、末日、變異、貪婪、吞噬、死神、腐敗 | 恐懼餘燼燃燒、首領腐敗削弱、嗜血渴望與全地圖斬殺 |

---

## 數據同步與維護

本專案持續追蹤遊戲版本更迭並校對數據：

- 已同步最新平衡性更新（包含排序疊加強化、排序菁英特效、蔑視弱者、收穫、逃避命運等節點之階級上限與金幣修正）；
- 修正火骰子符文圖示等美術對應；
- 文案與技能效果說明均以遊戲內實際顯示為準。

---

## 協作與數據校對

歡迎社群玩家共同維護與校對數據。

### 發現數值或文字錯誤
若發現天賦數值、花費或文字有誤：
1. 前往 [Issues 頁面](https://github.com/Estrella-071/random-dice-2-tree/issues)；
2. 選擇「數值 / 文字 / 圖示錯誤回報」；
3. 填寫節點名稱、目前顯示內容與遊戲內正確內容；
我們會在確認後更新。

### 提交修改 (Pull Request)
所有節點資料均維護於 [`site/data/dice_tree.json`](site/data/dice_tree.json)：
1. Fork 本專案並建立分支；
2. 修改 `site/data/dice_tree.json` 裡的數值；
3. 執行自動化測試確保資料格式正確：
   ```bash
   node verify_suite.mjs
   ```
4. 發起 Pull Request。

---

## 資料結構範例 (`dice_tree.json`)

每個節點的 JSON 格式定義如下：

```json
{
  "id": "1201",
  "name_zh": "子彈傷害%增加",
  "branch": 1,
  "node_type": "DICE_RUNE",
  "rune_dice": "Fire",
  "max_rank": 50,
  "unlock_gold": 2000,
  "unlock_core": 0,
  "total_gold": 465700,
  "total_core": 99,
  "gold_costs": [2000, 800, 800],
  "core_costs": [0, 0, 1],
  "incoming": ["1001"],
  "outgoing": ["1301", "1401"],
  "description_zh": "基本攻擊傷害增加{0}%<color=#00FF00>(+{1}%)</color>"
}
```

---

## 本機開發與預覽

本專案採用純原生 Web 技術（HTML5、CSS3、ES6 模組），無需打包建置步驟，啟動靜態伺服器即可預覽：

```bash
# 1. 複製專案
git clone https://github.com/Estrella-071/random-dice-2-tree.git
cd random-dice-2-tree

# 2. 啟動本機伺服器
# 使用 Node.js
npx serve site -l 3000

# 或使用 Python
python -m http.server 3000 --directory site

# 3. 執行端到端自動化測試
node verify_suite.mjs
```

在瀏覽器中開啟 `http://localhost:3000` 即可檢視。

---

## 免責聲明與著作權歸屬 (Disclaimer & Copyright)

- 本網站為非官方社群同人作品，所有引用之《Random Dice 2》遊戲美術素材、商標與角色版權均歸 **111 Percent Inc.** 所有。
- 本專案原始程式碼部分採用 [MIT License](LICENSE) 授權開源。
- **DMCA / Takedown Notice**:
  > *If you are a representative of 111 Percent Inc. and would like any assets removed, please contact [`itsestrella71@gmail.com`](mailto:itsestrella71@gmail.com) and we will comply immediately.*
