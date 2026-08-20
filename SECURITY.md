# 安全政策

## 回報方式

請不要在公開 issue 揭露可利用的安全問題。現階段請寄信至 [`itsestrella71@gmail.com`](mailto:itsestrella71@gmail.com?subject=Random%20Dice%202%20security%20report)，提供受影響 commit、重現步驟、最小 proof-of-concept 與影響範圍；不要寄送秘密或真實使用者資料。若未來建立專用 security advisory，將以該管道優先。

## 安全邊界

- 網站是公開、唯讀的靜態資料；沒有帳號、付款或伺服器端使用者資料。
- JSON 是可由 PR 修改的輸入；任何進入 `innerHTML` 的欄位都必須經過 schema、escaping 或 allowlist sanitizer。
- 測試 server 只能綁定 loopback、限制在 `site/` 目錄內，且不得暴露 CORS 到所有來源。
- 不得提交 secrets、IPA、私人 artifact 路徑或第三方未授權資料。

安全修正仍需執行一般資料與 browser smoke gate，並在 PR 中標明尚未覆蓋的 live/deployment 檢查。
