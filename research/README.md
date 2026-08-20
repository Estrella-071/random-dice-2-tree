# 研究工具與可重現邊界

`research/` 保存用來解析 Random Dice 2 iOS client 1.0.0 的研究腳本與分析筆記。它不是網站 runtime，也不是完整的官方資料發布包。

## 公開狀態

原始 IPA、解包目錄、研究輸出與大型文字/圖片中間檔由 `.gitignore` 排除，沒有隨 repository 發布。因此本文件不再連結不存在的本機輸出；遠端讀者只能重現已公開的腳本與結果摘要。若要發布完整結果，必須先建立版本化 artifact、輸入 SHA-256、工具版本、依賴 lock 與授權審核。

本次公開快照的輸入與輸出 hash 記錄在 [provenance.json](provenance.json)。輸入檔未隨 repository 發布；hash 只用於辨識維護者記錄的 extraction source。

## 主要流程

1. `extract_resources.py`：唯讀讀取合法取得的 Unity/iOS client，輸出 CSV、TextAsset 與影像研究資料。
2. `build_dice_tree.py`：讀取 extractor 產出的 CSV，建立 deterministic 的 `dice_tree.json` 與 SVG。
3. `site/data/dice_tree.json`：目前公開的 239-node client 1.0.0 snapshot；生成檔由 `npm run generate:data` 同步。

Python 依賴固定於 [requirements.txt](requirements.txt)。研究環境需求、原始輸入與版本限制請看 [REPRODUCING.md](../REPRODUCING.md)。

網站 PNG 的公開 inventory 位於 [asset-inventory.json](asset-inventory.json)。目前 repository 只保留 `runtime-allowlisted` 檔案；未列入 allowlist 的 extraction dump、一次性截圖與其他未使用素材不納入公開 Git tree 或 Pages staging。inventory 不等於第三方授權證明。

```bash
python -m venv .venv
python -m pip install -r research/requirements.txt
python research/extract_resources.py --help
python research/build_dice_tree.py --help
```

兩個主流程腳本需要外部 client 輸入；沒有該輸入時，`--help` 可檢查介面，但不能聲稱完成 extraction。

## 命名與限制

網站與研究輸出使用同一 canonical branch map：自然、工學、魔法、秩序、渾沌。`rune_catalog_count` 可能包含不在可視樹上的 supplemental rows，不能直接和 239 個 tree nodes 相加。

所有結果都是特定 client 版本的靜態證據，不代表目前線上遊戲狀態，也不構成官方攻略或授權資料。
