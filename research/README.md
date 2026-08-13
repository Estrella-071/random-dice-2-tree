# Random Dice 2 研究資料

主要輸出在 [random-dice-2-1.0.0](./random-dice-2-1.0.0/)：

- [繁中資料索引](./random-dice-2-1.0.0/guide_index_zh-Hant.md)
- [完整骰子數與 41／55 差異](./random-dice-2-1.0.0/complete_dice_list_zh-Hant.md)
- [第一輪攻略研究筆記](./random-dice-2-1.0.0/starter_notes_zh-Hant.md)
- [完整本地化 CSV](./random-dice-2-1.0.0/localization_text.csv)
- [骰子 CSV](./random-dice-2-1.0.0/dice_catalog.csv)
- [Boss CSV](./random-dice-2-1.0.0/boss_catalog.csv)
- [怪物血量攻略整理](./random-dice-2-1.0.0/monster_hp_guide_zh-Hant.md)
- [合作模式血量速查](./random-dice-2-1.0.0/coop_hp_guide_zh-Hant.md)
- [怪物血量 CSV](./random-dice-2-1.0.0/monster_hp_catalog.csv)
- [圖示索引](./random-dice-2-1.0.0/icons_manifest.json)
- [骰子樹 Sprite 圖示索引](./random-dice-2-1.0.0/sprites_manifest.json)
- Sprite 抽取備註：IPA 內的 `resources.assets` 含完整 Unity Sprite；若只按 `Dice_`／`Runenode_` 前綴篩選，會漏掉樹介面的 `Node*`、`Passivenode_*`、`TreeDim_*`、票券與貨幣圖示。現行抽取器已納入這批介面資源，輸出共 611 張 Sprite。
- [完整骰子樹（可縮放 SVG）](./random-dice-2-1.0.0/dice_tree_full.svg)
- 分支 SVG： [初始樹](./random-dice-2-1.0.0/dice_tree_branch_1.svg) · [工程](./random-dice-2-1.0.0/dice_tree_branch_2.svg) · [魔法](./random-dice-2-1.0.0/dice_tree_branch_3.svg) · [守護](./random-dice-2-1.0.0/dice_tree_branch_4.svg) · [入侵](./random-dice-2-1.0.0/dice_tree_branch_5.svg)
- [完整符文索引（153 筆 RuneTable）](./random-dice-2-1.0.0/dice_runes_full.svg) · [符文 CSV](./random-dice-2-1.0.0/rune_catalog.csv) · [繁中符文清單](./random-dice-2-1.0.0/dice_runes_full_zh-Hant.md)
- 骰子樹圖示校正版：遊戲內普遍採用 2 級圖示；貪婪使用 `Dice_Slow2`，恐懼使用 `Dice_TRANSFER2`、腐敗使用 `Dice_Crack2`，符文則按家族配對。完整 153 筆符文目前都有圖示來源。
- [完整骰子樹節點 CSV](./random-dice-2-1.0.0/dice_tree_nodes.csv)
- [資源提取器](./extract_resources.py)
- [骰子樹建圖器](./build_dice_tree.py)
