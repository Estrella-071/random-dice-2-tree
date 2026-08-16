# 專案貢獻指南 (Contributing Guide)

本專案為開源專案，收錄《Random Dice 2》天賦樹拓撲關係與各階升級數值。歡迎透過問題回報（Issue）或拉取請求（Pull Request）協助修正數據與改進功能。

---

## 貢獻範疇

1. **數值與描述勘誤**：修正因官方版本更新導致之效果數值、升級消耗、佔位符描述或解鎖條件。
2. **圖示對應修正**：修正節點與符文對應之圖示檔案名稱。
3. **功能改進**：包含效能最佳化、檢索體驗、配點計算等工具性功能。
4. **問題回報**：跨平台相容性異常、手勢行為失效或介面渲染問題。

---

## 數值與文字勘誤流程

若在遊戲中發現天賦描述、升級金幣、核心消耗或階級有誤：

1. 前往 GitHub 的 [Issues 頁面](https://github.com/Estrella-071/random-dice-2-tree/issues)。
2. 點擊 **New Issue** 並選擇 **[數值/文字/圖示錯誤回報]** 模板。
3. 提供以下資訊：
   - 節點 ID 或名稱（例如：`1201 子彈傷害%增加`）
   - 目前站上顯示數值
   - 遊戲內實際正確數值
   - 遊戲截圖或官方公告佐證

---

## 程式碼與資料 PR 流程

### 1. 建立分支
```bash
git clone https://github.com/<您的使用者名稱>/random-dice-2-tree.git
cd random-dice-2-tree
git checkout -b fix/node-balance-update
```

### 2. 檔案位置
- **資料檔案**：[`site/data/dice_tree.json`](site/data/dice_tree.json)
- **邏輯檔案**：[`site/app.js`](site/app.js)
- **樣式檔案**：[`site/styles.css`](site/styles.css)

### 3. 本地測試
提交前請務必執行端到端自動化測試：
```bash
node verify_suite.mjs
```

### 4. 提交規範 (Conventional Commits)
請使用標準 Commit 格式，例如：
- `fix(data): update 4307 tier cost to 50k gold and 10 cores`
- `feat(ui): optimize tooltip rendering performance`
- `docs: update contributing guidelines`

---

## 程式碼規範

- **零冗餘**：保持核心代碼精簡，禁止在程式庫中殘留一次性除錯腳本。
- **效能優先**：所有畫布操作需維持 GPU 硬體加速，避免引入造成 Layout 重排之高昂運算。
