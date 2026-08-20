# 資料模型與版本邊界

## Snapshot

目前 `site/data/dice_tree.json` 是從 Random Dice 2 iOS client 1.0.0 衍生的快照，不代表目前線上遊戲版本。更新資料時必須增加版本、日期、來源與限制說明；不要以「最新」描述未經證明的內容。

## Node

每個 `nodes[]` 項目至少包含：

- `id`：唯一節點 ID
- `branch` / `branch_zh`：1–5 與 canonical 派系名稱
- `node_type`：`DICE`、`DICE_RUNE`、`PLAYER_PASSIVE`、`PERK`
- `incoming` / `next_nodes`：節點圖的有向邊
- `icon_file`：相對於 `site/` 的公開路徑，必須以 `icons/` 開頭並存在
- `special_stats[].icon`（以及 `powerup_data` / `dot_data` 內的同名欄位）：必須使用 `site/icons/` 中實際存在且大小寫完全一致的 PNG 檔名；Linux CI 會拒絕僅大小寫不同的路徑
- 解鎖成本、階級、描述與節點專屬欄位

## Canonical localization

| branch | branch_zh |
| ---: | --- |
| 1 | 自然 |
| 2 | 工學 |
| 3 | 魔法 |
| 4 | 秩序 |
| 5 | 渾沌 |

`summary.nodes_by_type`、`summary.nodes_by_branch` 與 `summary.edge_count` 必須和實際資料一致。`rune_catalog_count` 可以包含不在可視樹上的 supplemental rows，文件需明確區分兩者。
