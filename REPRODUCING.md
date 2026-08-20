# 重現與資料來源

## 網站與驗證

需求：Node.js 20 以上、npm 10 以上。

```bash
git clone https://github.com/Estrella-071/random-dice-2-tree.git
cd random-dice-2-tree
npm ci
npm run validate
npm run build:pages
npm run setup:browser
npm run test:browser
```

`npm run test:browser` 會自行啟動 loopback 的暫時 port；可用 `VERIFY_PORT` 指定 port，用 `VERIFY_ARTIFACT_DIR` 指定本地截圖輸出目錄。不要把截圖或本機路徑提交到 Git。

## 研究資料

研究腳本讀取外部取得的 Unity/iOS client，並只寫入被 `.gitignore` 排除的研究輸出。原始 IPA 不隨 repository 發布，也不應提交到 Git。要重現研究結果，需取得合法且相同版本的輸入，記錄輸入 SHA-256、Python 版本、依賴 lock 與工具版本；若缺少其中任一項，結果必須標為未驗證。

`research/README.md` 只記錄可公開驗證的流程與快照狀態，不保證被忽略的本機輸出在遠端存在。

`npm run validate` 也會比對 [research/provenance.json](research/provenance.json) 中的公開 JSON/SVG SHA-256 與節點/邊數；若資料更新，必須同步更新 provenance 並在 PR 說明新的 client snapshot。
