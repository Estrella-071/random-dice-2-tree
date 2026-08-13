r"""Extract guide-friendly text and images from a Random Dice 2 Unity iOS app.

This script is intentionally read-only with respect to the supplied app bundle:
it only reads Unity TextAsset/Texture2D/Sprite objects and writes derived
research files under the output directory. It does not patch, re-sign, or
modify the app.

Usage (PowerShell):
    python research/extract_resources.py `
      --app-dir "Random Dice 2 1.0.0\Payload\RandomDice2.app" `
      --out-dir research\random-dice-2-1.0.0

UnityPy is required (``python -m pip install --user UnityPy``).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import plistlib
import re
import shutil
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable

import UnityPy  # type: ignore


TABLES = {
    "DefenderTable": ["DefenderType"],
    "DiceTreeNodeTable": ["Id"],
    "MinionTable": ["Id"],
    "TrophyTable": ["Id"],
    "VersusWaveTable": ["Id"],
    "CoopWaveTable": ["Id"],
    "TacticsEffectTable": ["TacticsKind"],
    "PerkActionTable": ["PerkActionType"],
    "PlayerPassiveTable": ["StringId"],
    "RuneTable": ["Id"],
    "GoodsTable": ["GoodsType"],
    "TipTable": ["Id"],
    "TutorialTable": ["Id"],
    "DiceSkinTable": ["DiceSkinKind"],
    "FieldSkinTable": ["FieldSkinKind"],
    "SeasonTable": ["SeasonId"],
}


def safe_name(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._")
    return value or "unnamed"


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="")


def human_text_assets(env) -> dict[str, str]:
    """Return the most useful (human-readable) TextAsset per name.

    Unity keeps a CSV-like TextAsset and a compact serialized copy for many
    tables. The CSV copy starts with a comma (or a leading space then comma),
    whereas the serialized copy contains control characters.
    """

    candidates: defaultdict[str, list[str]] = defaultdict(list)
    for obj in env.objects:
        if obj.type.name != "TextAsset":
            continue
        try:
            asset = obj.read()
            script = getattr(asset, "m_Script", None)
            name = getattr(asset, "m_Name", "")
        except Exception:
            continue
        if not isinstance(script, str) or not name:
            continue
        if "\ufffd" in script:
            continue
        candidates[name].append(script)

    chosen: dict[str, str] = {}
    for name, scripts in candidates.items():
        # Prefer a CSV/header-bearing copy. localization_text is not prefixed
        # by a comma, so accept it explicitly.
        csv_scripts = [s for s in scripts if s.lstrip().startswith(",")]
        if name == "localization_text":
            csv_scripts = [s for s in scripts if s.startswith(",ko,")]
        if csv_scripts:
            chosen[name] = max(csv_scripts, key=len)
        else:
            chosen[name] = max(scripts, key=len)
    return chosen


def csv_rows(text: str) -> list[list[str]]:
    return list(csv.reader(io.StringIO(text)))


def table_payload(text: str, first_column: str) -> tuple[list[str], list[list[str]]]:
    """Find a table header and data rows after Unity's optional preamble."""

    rows = csv_rows(text)
    for index, row in enumerate(rows):
        if row and row[0] == first_column:
            # The following row is a type-description row in these tables.
            data_start = index + 2 if index + 1 < len(rows) else index + 1
            return row, rows[data_start:]
    return [], []


def records(text: str, first_column: str) -> list[dict[str, str]]:
    header, data = table_payload(text, first_column)
    if not header:
        return []
    result: list[dict[str, str]] = []
    for row in data:
        if not row or not any(cell.strip() for cell in row):
            continue
        row = row + [""] * (len(header) - len(row))
        result.append(dict(zip(header, row[: len(header)])))
    return result


def localization_map(text: str) -> dict[str, dict[str, str]]:
    rows = csv_rows(text)
    header_index = next(
        (i for i, row in enumerate(rows) if row[:5] == ["", "ko", "en", "ja", "zh-tw"]),
        None,
    )
    if header_index is None:
        return {}
    result: dict[str, dict[str, str]] = {}
    for row in rows[header_index + 1 :]:
        if not row or not row[0].strip():
            continue
        row = row + [""] * (5 - len(row))
        result[row[0]] = {"ko": row[1], "en": row[2], "ja": row[3], "zh-tw": row[4]}
    return result


def export_table_csv(out_dir: Path, name: str, text: str, first_column: str) -> None:
    header, data = table_payload(text, first_column)
    if not header:
        return
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(data)
    write_text(out_dir / "tables" / f"{name}.csv", buffer.getvalue())


def markdown_escape(text: str) -> str:
    return str(text).replace("|", "\\|").replace("\r", "").replace("\n", "<br>")


MINION_TYPE_ZH = {
    "Normal": "普通怪物",
    "Speed": "速度怪物",
    "Big": "大型怪物",
    "Boss": "Boss",
    "Hunt": "狩獵目標",
    "Box": "寶箱",
    "BoxSp": "SP 寶箱",
    "Ghost": "幽靈",
}


def write_monster_hp_catalog(
    out_dir: Path,
    texts: dict[str, str],
    loc: dict[str, dict[str, str]],
) -> dict[str, int]:
    """Write mode-specific monster HP sources without flattening their semantics."""

    minions = records(texts.get("MinionTable", ""), "Id")
    trophy_rows = records(texts.get("TrophyTable", ""), "Id")
    versus_rows = records(texts.get("VersusWaveTable", ""), "Id")
    coop_rows = records(texts.get("CoopWaveTable", ""), "Id")

    def zh_name(key: str) -> str:
        if not key:
            return ""
        values = loc.get(key, {})
        return values.get("zh-tw", "") or values.get("en", "") or key

    boss_name_by_type = {
        row.get("BossType", ""): zh_name(row.get("Local_Name", ""))
        for row in minions
        if row.get("MinionType") == "Boss" and row.get("BossType")
    }
    fields = [
        "mode", "id", "wave", "monster_type", "boss_type", "boss_name_zh", "trophy",
        "base_hp", "boss_base_hp", "hp_increase", "hp_increase_interval", "boss_hp_per",
        "duration", "source_table",
    ]
    rows: list[dict[str, str]] = []

    for row in minions:
        boss_type = row.get("BossType", "")
        rows.append({
            "mode": "共通怪物設定",
            "id": row.get("Id", ""),
            "wave": "",
            "monster_type": MINION_TYPE_ZH.get(row.get("MinionType", ""), row.get("MinionType", "")),
            "boss_type": boss_type,
            "boss_name_zh": boss_name_by_type.get(boss_type, ""),
            "trophy": row.get("TrophyLevel", ""),
            "base_hp": "",
            "boss_base_hp": "",
            "hp_increase": "",
            "hp_increase_interval": "",
            "boss_hp_per": row.get("BossHpPer", ""),
            "duration": "",
            "source_table": "MinionTable",
        })

    for row in trophy_rows:
        rows.append({
            "mode": "競技場基礎血量",
            "id": row.get("Id", ""),
            "wave": "",
            "monster_type": "普通怪物",
            "boss_type": "",
            "boss_name_zh": "",
            "trophy": row.get("Trophy", ""),
            "base_hp": row.get("VersusMinionBaseHP", ""),
            "boss_base_hp": row.get("VersusBossBaseHP", ""),
            "hp_increase": "",
            "hp_increase_interval": "",
            "boss_hp_per": "",
            "duration": "",
            "source_table": "TrophyTable",
        })

    for row in versus_rows:
        rows.append({
            "mode": "競技場波次調整",
            "id": row.get("Id", ""),
            "wave": row.get("Id", ""),
            "monster_type": "波次共同設定",
            "boss_type": "",
            "boss_name_zh": "",
            "trophy": "",
            "base_hp": "",
            "boss_base_hp": "",
            "hp_increase": row.get("HPIncrease", ""),
            "hp_increase_interval": row.get("HPIncreaseInterval", ""),
            "boss_hp_per": "",
            "duration": row.get("Duration", ""),
            "source_table": "VersusWaveTable",
        })

    for row in coop_rows:
        boss_types = [row.get(f"BossType{i}", "") for i in (1, 2, 3)]
        boss_types = [value for value in boss_types if value and value != "None"]
        boss_names = [boss_name_by_type.get(value, value) for value in boss_types]
        rows.append({
            "mode": "合作波次血量",
            "id": row.get("Id", ""),
            "wave": row.get("Id", ""),
            "monster_type": "Boss 波" if row.get("BossBaseHP", "0") not in ("", "0") else "普通／速度／大型共用",
            "boss_type": "|".join(boss_types),
            "boss_name_zh": "、".join(boss_names),
            "trophy": "",
            "base_hp": "",
            "boss_base_hp": row.get("BossBaseHP", ""),
            "hp_increase": row.get("HPIncrease", ""),
            "hp_increase_interval": row.get("HPIncreaseInterval", ""),
            "boss_hp_per": "",
            "duration": "",
            "source_table": "CoopWaveTable",
        })

    if rows:
        buffer = io.StringIO(newline="")
        writer = csv.DictWriter(buffer, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
        write_text(out_dir / "monster_hp_catalog.csv", buffer.getvalue())

    lines = [
        "# Random Dice 2 怪物血量資料（iOS 1.0.0）",
        "",
        "> 這份資料把競技場基礎血量、競技場波次調整、合作模式波次血量分開；不要把 `HPIncrease` 或 `BossHpPer` 直接當成所有模式的最終 HP。",
        "",
        f"- 共通怪物設定：{len(minions)} 筆。",
        f"- 競技場段位基礎血量：{len(trophy_rows)} 筆。",
        f"- 競技場波次調整：{len(versus_rows)} 筆。",
        f"- 合作模式波次：{len(coop_rows)} 筆。",
        "",
        "## 共通怪物設定",
        "",
        "| 類型 | Boss 內部類型 | 繁中名稱 | 移速 | SP | BossHpPer | TrophyLevel |",
        "|---|---|---|---:|---:|---:|---:|",
    ]
    for row in minions:
        boss_type = row.get("BossType", "")
        lines.append(
            f"| {markdown_escape(MINION_TYPE_ZH.get(row.get('MinionType', ''), row.get('MinionType', '')))} | "
            f"{markdown_escape(boss_type)} | {markdown_escape(boss_name_by_type.get(boss_type, ''))} | "
            f"{markdown_escape(row.get('BaseMoveSpeed', ''))} | {markdown_escape(row.get('SPPer', ''))} | "
            f"{markdown_escape(row.get('BossHpPer', ''))} | {markdown_escape(row.get('TrophyLevel', ''))} |"
        )

    lines += [
        "",
        "## 競技場段位基礎血量",
        "",
        "| Trophy | 普通怪物基礎 HP | Boss 基礎 HP |",
        "|---:|---:|---:|",
    ]
    for row in trophy_rows:
        lines.append(f"| {row.get('Trophy', '')} | {row.get('VersusMinionBaseHP', '')} | {row.get('VersusBossBaseHP', '')} |")

    lines += [
        "",
        "## 競技場波次調整（原始欄位）",
        "",
        "| 波次設定 ID | 持續時間 | HPIncreaseInterval | HPIncrease |",
        "|---:|---:|---:|---:|",
    ]
    for row in versus_rows:
        lines.append(f"| {row.get('Id', '')} | {row.get('Duration', '')} | {row.get('HPIncreaseInterval', '')} | {row.get('HPIncrease', '')} |")

    lines += [
        "",
        "## 合作模式波次血量",
        "",
        "`BossBaseHP` 是該合作 Boss 波的 Boss 基礎 HP；非 Boss 波的 `HPIncrease` 是客戶端波次欄位，需依遊戲執行時的增加邏輯套用。",
        "",
        "| Wave | 類型 | HPIncrease | HPIncreaseInterval | BossBaseHP | Boss（繁中） |",
        "|---:|---|---:|---:|---:|---|",
    ]
    for row in coop_rows:
        boss_types = [row.get(f"BossType{i}", "") for i in (1, 2, 3)]
        boss_types = [value for value in boss_types if value and value != "None"]
        boss_names = [boss_name_by_type.get(value, value) for value in boss_types]
        kind = "Boss 波" if row.get("BossBaseHP", "0") not in ("", "0") else "一般波"
        lines.append(
            f"| {row.get('Id', '')} | {kind} | {row.get('HPIncrease', '')} | {row.get('HPIncreaseInterval', '')} | "
            f"{row.get('BossBaseHP', '')} | {markdown_escape('、'.join(boss_names))} |"
        )

    lines += [
        "",
        "## 欄位解讀與限制",
        "",
        "- `TrophyTable.VersusMinionBaseHP`／`VersusBossBaseHP`：競技場段位對應的基礎 HP，這是最直接可引用的競技場基準。",
        "- `CoopWaveTable.BossBaseHP`：合作模式 Boss 波的基礎 Boss HP；`BossType1～3` 是該波的 Boss 順序。",
        "- `CoopWaveTable.HPIncrease`、`VersusWaveTable.HPIncrease`：波次調整原值；客戶端還會依間隔、波次、模式與可能的戰術／活動效果套用。",
        "- `MinionTable.BossHpPer`：Boss 個別 HP 比例欄位（例如 Quick／Joker 為 50），不是一個獨立的固定 HP。",
        "- 以上是 1.0.0 客戶端資料；伺服器平衡、活動加成、戰術效果與未公開公式需用遊戲內實測再核對。",
    ]
    write_text(out_dir / "monster_hp_guide_zh-Hant.md", "\n".join(lines) + "\n")
    return {
        "minion_types": len(minions),
        "trophy_hp_rows": len(trophy_rows),
        "versus_wave_rows": len(versus_rows),
        "coop_wave_rows": len(coop_rows),
        "monster_hp_rows": len(rows),
    }


def write_coop_hp_guide(
    out_dir: Path,
    texts: dict[str, str],
    loc: dict[str, dict[str, str]],
) -> int:
    """Write a compact, reader-first guide for the 80 cooperative waves."""

    minions = records(texts.get("MinionTable", ""), "Id")
    waves = records(texts.get("CoopWaveTable", ""), "Id")
    boss_name_by_type = {
        row.get("BossType", ""): (
            loc.get(row.get("Local_Name", ""), {}).get("zh-tw", "")
            or loc.get(row.get("Local_Name", ""), {}).get("en", "")
            or row.get("BossType", "")
        )
        for row in minions
        if row.get("MinionType") == "Boss" and row.get("BossType")
    }

    def number(value: str) -> str:
        try:
            return f"{int(float(value)):,}"
        except (TypeError, ValueError):
            return value or "—"

    boss_waves = [row for row in waves if row.get("BossBaseHP", "") not in ("", "0")]
    normal_waves = [row for row in waves if row.get("BossBaseHP", "") in ("", "0")]
    lines = [
        "# Random Dice 2 合作模式血量速查（iOS 1.0.0）",
        "",
        "> 先看 Boss 表即可：合作模式每 5 波一次 Boss 波。普通波的 `HPIncrease` 是客戶端用來增加怪物基礎 HP 的原始值，不是單隻怪物在畫面上一定會顯示的最終 HP。",
        "",
        "## 最重要：Boss 波血量",
        "",
        "| Boss 波 | Boss 基礎 HP | Boss 順序 |",
        "|---:|---:|---|",
    ]
    for row in boss_waves:
        boss_types = []
        for index in (1, 2, 3):
            boss_type = row.get(f"BossType{index}", "")
            if boss_type and boss_type != "None":
                spawn_time = row.get(f"BossSpawnTime{index}", "")
                name = boss_name_by_type.get(boss_type, boss_type)
                boss_types.append(f"{name}（{spawn_time} 秒）" if spawn_time else name)
        lines.append(f"| {row.get('Id', '')} | {number(row.get('BossBaseHP', ''))} | {' → '.join(boss_types)} |")

    lines += [
        "",
        "## 普通波：看 `HPIncrease`，不要直接當成最終 HP",
        "",
        "| 波次 | HPIncrease | 每次增加間隔（秒） |",
        "|---:|---:|---:|",
    ]
    for row in normal_waves:
        lines.append(f"| {row.get('Id', '')} | {number(row.get('HPIncrease', ''))} | {row.get('HPIncreaseInterval', '') or '—'} |")

    lines += [
        "",
        "## 三個血量欄位怎麼看",
        "",
        "- `BossBaseHP`：Boss 波的 Boss 基礎 HP；例如 Wave 5 是 150,000，Wave 80 是 500,000,000。這是目前資料中最直接的合作模式血量。",
        "- `HPIncrease`：普通波／整波的 HP 增加原始值；例如 Wave 1 是 500、Wave 49 是 249,400。它要配合遊戲的波次運算，不能直接說成「每隻普通怪固定 HP」。",
        "- `HPIncreaseInterval`：HP 增加間隔（秒），例如 Wave 1 是 6 秒；它不是血量本身。",
        "",
        "## 血量在哪裡找到？",
        "",
        "1. IPA 內的 Unity 資產：`Data/resources.assets`。",
        "2. 其中的 `TextAsset`：`CoopWaveTable`。",
        "3. 相關原始欄位：`BossBaseHP`、`HPIncrease`、`HPIncreaseInterval`、`BossType1～3`。",
        "4. 已提取檔案：`tables/CoopWaveTable.csv`。",
        "5. 本整理檔：`coop_hp_guide_zh-Hant.md`；完整混合資料：`monster_hp_catalog.csv`。",
        "",
        "## 限制",
        "",
        "- 這是 iOS 1.0.0 客戶端快照；目前版本、活動、戰術效果或伺服器平衡可能不同。",
        "- `BossBaseHP` 可以直接作為本版本合作 Boss 基礎值引用；普通怪物的最終 HP 仍需要遊戲內實測或還原 `CheckIncreaseMinionBaseHP` 的執行公式。",
    ]
    write_text(out_dir / "coop_hp_guide_zh-Hant.md", "\n".join(lines) + "\n")
    return len(boss_waves)


def write_catalogs(out_dir: Path, texts: dict[str, str]) -> dict[str, int]:
    loc = localization_map(texts.get("localization_text", ""))

    # Keep the complete source text in CSV form for spreadsheet/search use.
    if "localization_text" in texts:
        rows = csv_rows(texts["localization_text"])
        buffer = io.StringIO(newline="")
        writer = csv.writer(buffer, lineterminator="\n")
        writer.writerows(rows)
        write_text(out_dir / "localization_text.csv", buffer.getvalue())

    for name, first_columns in TABLES.items():
        if name in texts:
            export_table_csv(out_dir, name, texts[name], first_columns[0])

    dice = records(texts.get("DefenderTable", ""), "DefenderType")
    tree_nodes = records(texts.get("DiceTreeNodeTable", ""), "Id")
    active_kind_ids = {
        row.get("KindId", "")
        for row in tree_nodes
        if row.get("NodeType") == "DICE"
    }
    dice_rows: list[dict[str, str]] = []
    dice_keys = ["Local_Name", "Local_FullName", "Local_Desc", "Local_Lv7"]
    for index, item in enumerate(dice, start=1):
        item = dict(item)
        item["TreeActive"] = "True" if str(index) in active_kind_ids else "False"
        for key in dice_keys:
            text_id = item.get(key, "")
            item[f"zh_tw_{key.lower()}"] = loc.get(text_id, {}).get("zh-tw", "")
            item[f"en_{key.lower()}"] = loc.get(text_id, {}).get("en", "")
        dice_rows.append(item)

    if dice_rows:
        preferred = [
            "DefenderType",
            "DefenderGroupType",
            "TargetingType",
            "DefenderAttackType",
            "Attack",
            "Attack_LvAdd",
            "Attack_UpAdd",
            "Range",
            "AttackInterval",
            "BossAttackPer",
            "DefenderSkillKind",
            "TreeActive",
            "Local_Name",
            "Local_FullName",
            "Local_Desc",
            "Local_Lv7",
            "zh_tw_local_name",
            "zh_tw_local_fullname",
            "zh_tw_local_desc",
            "zh_tw_local_lv7",
            "en_local_name",
            "en_local_fullname",
            "en_local_desc",
            "en_local_lv7",
        ]
        header = [key for key in preferred if any(key in row for row in dice_rows)]
        header += [key for key in dice_rows[0] if key not in header]
        buffer = io.StringIO(newline="")
        writer = csv.DictWriter(buffer, fieldnames=header, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(dice_rows)
        write_text(out_dir / "dice_catalog.csv", buffer.getvalue())

    # Separate the current Dice Tree's 41 DICE nodes from additional
    # DefenderTable definitions that are not represented as active tree nodes
    # in this client snapshot. This prevents a screenshot of one tree branch
    # from being mistaken for the complete playable set.
    active_dice = [row for row in dice_rows if row.get("TreeActive") == "True"]
    inactive_dice = [row for row in dice_rows if row.get("TreeActive") != "True"]
    dice_list_lines = [
        "# Random Dice 2 完整骰子數（iOS 1.0.0）",
        "",
        "> 截圖只能看到骰子樹的一個視窗；以下以客戶端 `DefenderTable` 與 `DiceTreeNodeTable` 交叉整理。",
        "",
        f"- `DefenderTable` 定義：**{len(dice_rows)}** 筆。",
        f"- `DiceTreeNodeTable` 的 `NodeType=DICE`：**{len(active_dice)}** 筆，這是本版本樹上列出的現行骰子節點。",
        f"- 其餘 `DefenderTable` 定義：**{len(inactive_dice)}** 筆，`TreeActive=False`；可能是特殊／保留／非樹上用途，需以遊戲內畫面核對。",
        "",
        "## 現行骰子樹節點（41）",
        "",
        "| # | 內部類型 | 繁中名稱 | 英文名稱 | 分組 |",
        "|---:|---|---|---|---|",
    ]
    for number, row in enumerate(active_dice, start=1):
        dice_list_lines.append(
            f"| {number} | {markdown_escape(row.get('DefenderType', ''))} | "
            f"{markdown_escape(row.get('zh_tw_local_fullname') or row.get('zh_tw_local_name', '') or '（未翻譯）')} | "
            f"{markdown_escape(row.get('en_local_fullname') or row.get('en_local_name', '') or '—')} | "
            f"{markdown_escape(row.get('DefenderGroupType', ''))} |"
        )
    dice_list_lines += ["", "## 非現行樹節點定義（14）", "", "| 內部類型 | 繁中名稱 | 英文名稱 | Use 欄位 |", "|---|---|---|---|"]
    for row in inactive_dice:
        dice_list_lines.append(
            f"| {markdown_escape(row.get('DefenderType', ''))} | "
            f"{markdown_escape(row.get('zh_tw_local_fullname') or row.get('zh_tw_local_name', '') or '（未翻譯）')} | "
            f"{markdown_escape(row.get('en_local_fullname') or row.get('en_local_name', '') or '—')} | "
            f"{markdown_escape(row.get('Use', ''))} |"
        )
    write_text(out_dir / "complete_dice_list_zh-Hant.md", "\n".join(dice_list_lines) + "\n")

    bosses = records(texts.get("MinionTable", ""), "Id")
    boss_rows: list[dict[str, str]] = []
    for item in bosses:
        if item.get("MinionType") != "Boss":
            continue
        item = dict(item)
        for key in ("Local_Name", "Local_Desc"):
            text_id = item.get(key, "")
            item[f"zh_tw_{key.lower()}"] = loc.get(text_id, {}).get("zh-tw", "")
            item[f"en_{key.lower()}"] = loc.get(text_id, {}).get("en", "")
        boss_rows.append(item)
    if boss_rows:
        header = list(boss_rows[0])
        buffer = io.StringIO(newline="")
        writer = csv.DictWriter(buffer, fieldnames=header, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(boss_rows)
        write_text(out_dir / "boss_catalog.csv", buffer.getvalue())

    hp_counts = write_monster_hp_catalog(out_dir, texts, loc)
    coop_boss_waves = write_coop_hp_guide(out_dir, texts, loc)

    # A compact Traditional-Chinese index for quick guide drafting.
    lines = [
        "# Random Dice 2 1.0.0 資料索引",
        "",
        "> 來源：你提供的 iOS Unity 資產；數值與名稱可能隨伺服器內容或版本更新而變動。這份索引是研究素材，不是官方攻略。",
        "",
        f"- 可讀本地化鍵：{len(loc):,}",
        f"- DefenderTable 骰子定義：{len(dice_rows):,}",
        f"- DiceTree 現行 DICE 節點：{len(active_dice):,}",
        f"- Boss 資料列：{len(boss_rows):,}",
        f"- 怪物血量來源：競技場段位 {hp_counts['trophy_hp_rows']:,} 筆、競技場波次 {hp_counts['versus_wave_rows']:,} 筆、合作波次 {hp_counts['coop_wave_rows']:,} 筆",
        "",
        "## 骰子（繁中）",
        "",
        "| 類型 | 分組 | 名稱 | 7 點覺醒 | 基礎攻擊 | 攻擊間隔 | 描述 |",
        "|---|---|---|---|---:|---:|---|",
    ]
    for row in dice_rows:
        lines.append(
            "| {DefenderType} | {DefenderGroupType} | {name} | {lv7} | {Attack} | {AttackInterval} | {desc} |".format(
                DefenderType=markdown_escape(row.get("DefenderType", "")),
                DefenderGroupType=markdown_escape(row.get("DefenderGroupType", "")),
                name=markdown_escape(row.get("zh_tw_local_fullname") or row.get("zh_tw_local_name", "")),
                lv7=markdown_escape(row.get("zh_tw_local_lv7", "")),
                Attack=markdown_escape(row.get("Attack", "")),
                AttackInterval=markdown_escape(row.get("AttackInterval", "")),
                desc=markdown_escape(row.get("zh_tw_local_desc", "")),
            )
        )
    lines += ["", "## Boss（繁中）", "", "| Boss | 移速 | SP | Boss HP 係數 | 解鎖獎盃等級 | 描述 |", "|---|---:|---:|---:|---:|---|"]
    for row in boss_rows:
        lines.append(
            "| {name} | {speed} | {sp} | {hp} | {trophy} | {desc} |".format(
                name=markdown_escape(row.get("zh_tw_local_name", "") or row.get("BossType", "")),
                speed=markdown_escape(row.get("BaseMoveSpeed", "")),
                sp=markdown_escape(row.get("SPPer", "")),
                hp=markdown_escape(row.get("BossHpPer", "")),
                trophy=markdown_escape(row.get("TrophyLevel", "")),
                desc=markdown_escape(row.get("zh_tw_local_desc", "")),
            )
        )
    lines += [
        "",
        "## 先做攻略時最值得查的資料表",
        "",
        "- `tables/TacticsEffectTable.csv`：開局／中盤／合作模式戰術效果與數值。",
        "- `tables/PerkActionTable.csv`：Trash、Reroll、Tsunami、Cannon、Lava 等支援者動作。",
        "- `tables/PlayerPassiveTable.csv`：骰子攻擊、攻速、暴擊傷害、各陣營被動。",
        "- `tables/RuneTable.csv`：符文種類、等級上限、數值與對應骰子。",
        "- `tables/TutorialTable.csv`：新手流程、觸發元件與文字鍵。",
        "- `monster_hp_guide_zh-Hant.md`：競技場／合作模式的怪物 HP、波次調整與欄位解讀。",
        "- `coop_hp_guide_zh-Hant.md`：只看合作模式的 Boss 波與普通波 HPIncrease 速查。",
        "- `monster_hp_catalog.csv`：將共通怪物、段位、競技場波次、合作波次整理成可篩選資料。",
        "- `localization_text.csv`：所有語言原文；繁中欄位是 `zh-tw`。",
    ]
    write_text(out_dir / "guide_index_zh-Hant.md", "\n".join(lines) + "\n")
    return {
        "localization": len(loc),
        "dice_definitions": len(dice_rows),
        "tree_dice": len(active_dice),
        "bosses": len(boss_rows),
        "coop_boss_waves": coop_boss_waves,
        **hp_counts,
    }


IMAGE_SOURCE_IGNORED_SUFFIXES = {
    ".ress",
    ".resource",
    ".dat",
    ".json",
    ".xml",
    ".dll",
    ".bin",
    ".hash",
    ".config",
    ".plist",
    ".txt",
}


def discover_unity_sources(app_dir: Path) -> list[Path]:
    """Find Unity serialized files and Addressables bundles in the app.

    The original extractor only opened ``Data/resources.assets``. UI art is
    also stored in ``sharedassets0.assets``, built-in Resources, and bundles,
    so the full image pass must inspect every plausible Unity container while
    ignoring companion resource blobs and ordinary managed files.
    """

    data_dir = app_dir / "Data"
    sources: list[Path] = []
    for path in data_dir.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(data_dir).as_posix()
        if relative.startswith("Managed/") or path.suffix.lower() in IMAGE_SOURCE_IGNORED_SUFFIXES:
            continue
        is_main_asset = path.name in {
            "globalgamemanagers",
            "globalgamemanagers.assets",
            "resources.assets",
        }
        is_scene_asset = path.name.startswith("level") or path.name.startswith("sharedassets")
        is_resource_or_bundle = relative.startswith("Resources/") or relative.startswith("Raw/aa/")
        if is_main_asset or is_scene_asset or is_resource_or_bundle or path.suffix.lower() in {".assets", ".bundle"}:
            sources.append(path)

    def source_sort_key(path: Path) -> tuple[int, str]:
        relative = path.relative_to(data_dir).as_posix()
        if relative == "resources.assets":
            priority = 0
        elif relative == "sharedassets0.assets":
            priority = 1
        elif relative.startswith("sharedassets"):
            priority = 2
        elif relative == "globalgamemanagers.assets":
            priority = 3
        elif relative.startswith("level"):
            priority = 4
        elif relative.startswith("Resources/"):
            priority = 5
        elif relative.startswith("Raw/aa/"):
            priority = 6
        else:
            priority = 7
        return priority, relative.casefold()

    return sorted(set(sources), key=source_sort_key)


def _clear_generated_pngs(directory: Path) -> None:
    """Clear only generated image children before rebuilding a folder."""

    directory.mkdir(parents=True, exist_ok=True)
    for child in directory.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


def _image_candidate_key(candidate: dict[str, object]) -> tuple[object, ...]:
    return (
        -int(candidate["width"]) * int(candidate["height"]),
        int(candidate["source_rank"]),
        str(candidate["source_file"]).casefold(),
        int(candidate["path_id"]),
    )


def _allocate_image_filename(stem: str, used: set[str]) -> str:
    filename = f"{stem}.png"
    suffix = 2
    while filename.casefold() in used:
        filename = f"{stem}__variant{suffix}.png"
        suffix += 1
    used.add(filename.casefold())
    return filename


def export_all_images(sources: list[Path], out_dir: Path) -> dict[str, object]:
    """Export every readable named Texture2D and Sprite object.

    Every Unity object is retained, including same-name variants from
    different atlases or containers. The largest variant keeps the original
    asset name for guide compatibility; additional variants receive a
    ``__variantN`` suffix and retain their source/path ID in the manifest.
    """

    data_dir = sources[0].parents[0] if sources else out_dir
    candidates: dict[str, defaultdict[str, list[dict[str, object]]]] = {
        "Texture2D": defaultdict(list),
        "Sprite": defaultdict(list),
    }
    source_stats: list[dict[str, object]] = []
    errors: list[dict[str, object]] = []
    environments: list[object] = []

    for source_rank, source in enumerate(sources):
        source_file = source.relative_to(data_dir).as_posix()
        try:
            env = UnityPy.load(str(source))
        except Exception as exc:
            errors.append({"phase": "load", "source_file": source_file, "error": str(exc)[:400]})
            continue
        environments.append(env)
        object_counts = Counter(obj.type.name for obj in env.objects)
        readable_counts = Counter()
        source_error_count = 0
        for obj in env.objects:
            asset_type = obj.type.name
            if asset_type not in candidates:
                continue
            name = ""
            try:
                asset = obj.read()
                name = str(getattr(asset, "m_Name", "") or "")
                if not name:
                    continue
                image = asset.image
                width, height = image.size
                if width <= 0 or height <= 0:
                    continue
                candidate = {
                    "name": name,
                    "source_file": source_file,
                    "source_rank": source_rank,
                    "path_id": int(obj.path_id),
                    "width": int(width),
                    "height": int(height),
                    "object": obj,
                }
                candidates[asset_type][name].append(candidate)
                readable_counts[asset_type] += 1
            except Exception as exc:
                source_error_count += 1
                errors.append(
                    {
                        "phase": "read",
                        "source_file": source_file,
                        "asset_type": asset_type,
                        "name": str(locals().get("name", "")),
                        "path_id": int(obj.path_id),
                        "error": str(exc)[:400],
                    }
                )
        source_stats.append(
            {
                "source_file": source_file,
                "object_count": len(env.objects),
                "texture_objects": int(object_counts.get("Texture2D", 0)),
                "sprite_objects": int(object_counts.get("Sprite", 0)),
                "readable_textures": int(readable_counts.get("Texture2D", 0)),
                "readable_sprites": int(readable_counts.get("Sprite", 0)),
                "read_errors": source_error_count,
            }
        )

    manifests: dict[str, list[dict[str, object]]] = {}
    output_dirs = {"Texture2D": out_dir / "icons", "Sprite": out_dir / "sprite_icons"}
    output_prefixes = {"Texture2D": "icons", "Sprite": "sprite_icons"}
    for asset_type, groups in candidates.items():
        output_dir = output_dirs[asset_type]
        _clear_generated_pngs(output_dir)
        used_filenames: set[str] = set()
        manifest: list[dict[str, object]] = []
        for name in sorted(groups, key=lambda value: (value.casefold(), value)):
            variants = sorted(groups[name], key=_image_candidate_key)
            stem = safe_name(name)
            for variant_index, candidate in enumerate(variants, start=1):
                filename_stem = stem if variant_index == 1 else f"{stem}__variant{variant_index}"
                filename = _allocate_image_filename(filename_stem, used_filenames)
                path = output_dir / filename
                try:
                    asset = candidate["object"].read()
                    image = asset.image
                    image.save(path)
                    digest = hashlib.sha256(path.read_bytes()).hexdigest()
                except Exception as exc:
                    errors.append(
                        {
                            "phase": "save",
                            "source_file": candidate["source_file"],
                            "asset_type": asset_type,
                            "name": name,
                            "path_id": candidate["path_id"],
                            "error": str(exc)[:400],
                        }
                    )
                    continue
                manifest.append(
                    {
                        "name": name,
                        "file": f"{output_prefixes[asset_type]}/{filename}",
                        "width": candidate["width"],
                        "height": candidate["height"],
                        "sha256": digest,
                        "source_file": candidate["source_file"],
                        "path_id": candidate["path_id"],
                        "variant": variant_index,
                        "canonical": variant_index == 1,
                    }
                )
        manifest.sort(key=lambda item: (str(item["name"]).casefold(), str(item["name"]), int(item["variant"])))
        manifests[asset_type] = manifest

    write_text(out_dir / "icons_manifest.json", json.dumps(manifests["Texture2D"], ensure_ascii=False, indent=2) + "\n")
    write_text(out_dir / "sprites_manifest.json", json.dumps(manifests["Sprite"], ensure_ascii=False, indent=2) + "\n")
    write_text(out_dir / "image_extraction_errors.json", json.dumps(errors, ensure_ascii=False, indent=2) + "\n")
    return {
        "texture_objects": len(manifests["Texture2D"]),
        "sprite_objects": len(manifests["Sprite"]),
        "texture_names": len(candidates["Texture2D"]),
        "sprite_names": len(candidates["Sprite"]),
        "source_files": source_stats,
        "errors": errors,
    }


def copy_app_basics(app_dir: Path, out_dir: Path) -> list[dict[str, object]]:
    basics = out_dir / "app_basics"
    basics.mkdir(parents=True, exist_ok=True)
    copied: list[dict[str, object]] = []
    for source_name in (
        "AppIcon60x60@2x.png",
        "AppIcon76x76@2x~ipad.png",
        "LaunchScreen-iPhonePortrait.png",
        "LaunchScreen-iPhoneLandscape.png",
        "LaunchScreen-iPad.png",
    ):
        source = app_dir / source_name
        if not source.exists():
            continue
        destination = basics / source.name
        shutil.copy2(source, destination)
        copied.append({"source": source_name, "file": f"app_basics/{source.name}", "bytes": destination.stat().st_size})
    return copied


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app-dir", type=Path, required=True, help="Path to RandomDice2.app")
    parser.add_argument("--out-dir", type=Path, required=True, help="Derived output directory")
    args = parser.parse_args()

    app_dir = args.app_dir.resolve()
    out_dir = args.out_dir.resolve()
    resources = app_dir / "Data" / "resources.assets"
    if not resources.exists():
        raise SystemExit(f"resources.assets not found: {resources}")

    out_dir.mkdir(parents=True, exist_ok=True)
    sources = discover_unity_sources(app_dir)
    env = UnityPy.load(str(resources))
    texts = human_text_assets(env)
    text_dir = out_dir / "text_assets"
    for name, script in sorted(texts.items()):
        # Avoid dumping compact binary duplicates; keep readable sources and a
        # small allow-list of named assets useful for a guide.
        if name == "localization_text" or name in TABLES or name.endswith("Table"):
            if "\x00" not in script[:32] and "\ufffd" not in script:
                write_text(text_dir / f"{safe_name(name)}.txt", script)

    counts = write_catalogs(out_dir, texts)
    images = export_all_images(sources, out_dir)
    basics = copy_app_basics(app_dir, out_dir)

    info: dict[str, object] = {
        "source_app": str(app_dir),
        "bundle_identifier": "com.percent.ios.randomdice2",
        "version": "1.0.0",
        "unity": "6000.3.18f1",
        "outputs": counts,
        "icon_textures": images["texture_objects"],
        "icon_sprites": images["sprite_objects"],
        "texture_names": images["texture_names"],
        "sprite_names": images["sprite_names"],
        "image_source_count": len(sources),
        "image_sources": images["source_files"],
        "image_error_count": len(images["errors"]),
        "image_scope": "All readable named Texture2D and Sprite objects from discovered Unity containers; same-name variants are retained with __variantN filenames.",
        "app_basics": basics,
        "note": "Derived research files from a supplied app bundle; verify against live game before publishing.",
    }
    write_text(out_dir / "manifest.json", json.dumps(info, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
