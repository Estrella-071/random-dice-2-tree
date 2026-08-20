# NOTICE：程式碼、資料與第三方素材

本 repository 的原始程式碼與文件依 [LICENSE](LICENSE) 的 MIT 條款發布，除非該檔案另有說明。

`site/icons/`、內嵌於 SVG 的圖像、遊戲內文字、數值資料、角色/骰子名稱與商標是從 Random Dice 2 iOS client 1.0.0 衍生的社群研究資料，可能受 111 Percent Inc. 或其他權利人保護；MIT 不會自動授予這些第三方素材的再散布權。保留在 repository 的圖示只限 `site/runtime-allowlist.json` 所列的網站 runtime 檔案，這個範圍限制不代表已取得官方授權。

未列入 allowlist 的 extraction dump、一次性測試截圖與其他未使用素材不屬於公開網站內容，也不應重新加入 repository 或 Pages artifact。若權利人要求撤下或限制使用，請直接依下方流程提出檔案路徑與權利主張。

若權利人要求撤下或限制使用，請聯絡 repository 維護者，並提供檔案路徑與權利主張。維護者會先隔離相關資產，再記錄處理結果；不要在未確認前把受爭議素材重新加入部署 allowlist。

網站目前會嘗試從 Google Fonts 載入 Noto Sans TC；這會把瀏覽器對 Google 的請求 metadata 交給第三方。離線時會回退到系統字型。需要避免第三方請求的部署者應自架字型或移除該載入，並在 PR 中記錄決策。
