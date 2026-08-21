# NOTICE：程式碼、資料與第三方素材

本 repository 的原始程式碼與文件依 [LICENSE](LICENSE) 的 MIT 條款發布；個別檔案另有說明時，以該檔案為準。

`site/icons/`、內嵌於 SVG 的圖像、遊戲內文字、數值資料、角色/骰子名稱與商標來自 Random Dice 2 iOS client 1.0.0 的社群研究，相關權利可能屬於 111 Percent Inc. 或其他權利人。這些內容沿用各自的權利範圍；repository 目前只在 `site/runtime-allowlist.json` 列出可部署的圖示，MIT 條款只適用於相應的程式碼與文件。

目前網站內容只使用 allowlist 列出的檔案。extraction dump、一次性測試截圖與其他未使用素材保留在研究範圍；若舊版本曾進入公開 Git history，allowlist 只管理現在的部署與 working tree，歷史清理仍需維護者與法律決策。

權利人可聯絡 repository 維護者，並提供檔案路徑與權利主張。維護者會先隔離相關資產，再記錄處理結果；受爭議素材在完成確認前維持隔離狀態。

網站目前會嘗試從 Google Fonts 載入 Noto Sans TC，瀏覽器請求的 metadata 會送往 Google；離線時回退到系統字型。需要移除第三方請求的部署者可自架字型或移除該載入，並在 PR 中記錄決策。
