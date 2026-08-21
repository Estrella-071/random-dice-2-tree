# 安全政策

## 回報方式

安全問題請寄信至 [`itsestrella71@gmail.com`](mailto:itsestrella71@gmail.com?subject=Random%20Dice%202%20security%20report)，附上受影響 commit、重現步驟、最小 proof-of-concept 與影響範圍。請在寄信前移除秘密與真實使用者資料；未來若建立專用 security advisory，將以該管道優先。

## 安全邊界

- 網站提供公開、唯讀的靜態資料；本專案範圍涵蓋網站檔案，不處理帳號、付款與伺服器端使用者資料。
- JSON 可由 PR 修改；進入 `innerHTML` 的欄位一律經過 schema、escaping 或 allowlist sanitizer。
- 測試 server 綁定 loopback，只服務 repository 的 `site/` 或 `build:pages` 產生的 `.pages/` staging；CORS 僅在有明確需求時開放指定來源。
- secrets、IPA、私人 artifact 路徑與未授權第三方資料留在本機或私下管道。

安全修正沿用資料與 browser smoke gate，PR 另請列出尚待測試的 live/deployment 項目。
