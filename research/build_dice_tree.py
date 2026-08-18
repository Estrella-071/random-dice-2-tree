"""Build a complete, guide-friendly Dice Tree catalogue and map.

The input is the derived CSV package produced by extract_resources.py. This
keeps this step deterministic and avoids touching the supplied IPA.
"""

from __future__ import annotations

import argparse
import base64
import csv
import html
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable



NODE_TYPE_ZH = {
    "DICE": "骰子",
    "DICE_RUNE": "骰子符文",
    "PLAYER_PASSIVE": "玩家被動",
    "PERK": "支援",
}

BRANCH_ZH = {
    1: "初始樹",
    2: "工程分支",
    3: "魔法分支",
    4: "守護分支",
    5: "入侵分支",
}

BRANCH_COLOR = {
    1: "#ef625e",
    2: "#50b7d8",
    3: "#a871ec",
    4: "#f3bd55",
    5: "#e979a5",
}

# The client places one representative die around the central Dice Tree card.
# These are the five branch roots already present in the extracted tree data;
# the center card itself is UI chrome and therefore is not a data node.
TREE_CENTER_ROOTS = {
    1: "1001",  # Fire / 自然
    2: "2001",  # Iron / 工學
    3: "3001",  # Electric / 魔法
    4: "4008",  # Bingo / 秩序
    5: "5002",  # Fear / 渾沌
}

# The client draws the group name/colour in the centre card.  The number is
# not a hard-coded account-progress snapshot: ``center_stats_for_nodes``
# derives it from the complete DiceTreeNodeTable so a fully unlocked tree is
# represented by the actual number of nodes in each branch.
TREE_CENTER_GROUPS = {
    1: ("自然", "#8ae665"),
    2: ("工學", "#f9da67"),
    3: ("魔法", "#4591f0"),
    4: ("秩序", "#9c97bc"),
    5: ("渾沌", "#aa3cea"),
}

# The extracted tree coordinates are rendered at the client node scale.  The
# serialized PopupDiceTree prefabs use 236/160/260-unit roots for dice,
# regular passive and big passive nodes, while DiceTreeRuneNode is the compact
# 130x140-unit child around a dice card.  At the full-map topology scale this
# corresponds to the normal 0.72 treatment and a rune-only 0.56 treatment.
CLIENT_NODE_SCALE = 0.72
CLIENT_RUNE_SCALE = 0.56
PASSIVE_GLYPH_SCALE = 0.90
# The client lets the die art sit slightly outside the card shell.  Keep the
# bottom edge anchored to the shell while enlarging the art enough for its top
# edge to overlap the frame, instead of scaling the whole node geometry.
DICE_ICON_SCALE = 1.08
# NodeSocketShadow's straight inner edge is the 89px vertical / 148px
# horizontal corner in its 262x252 source.  The final placement keeps only a
# small part of the mask tucked beneath the die.
DICE_SHADOW_SCALE = 1.09
DICE_SHADOW_INSET_X = 23
DICE_SHADOW_INSET_Y = 44
DICE_SHADOW_INNER_X = 89 / 262
DICE_SHADOW_INNER_Y = 148 / 252

# Exact mapping extracted from IconResources.PlayerPassiveIconDict.  The
# previous name/category heuristic swapped the Magic/Invasion summon effects
# and replaced the five support upgrades with generic stat glyphs.  Keep the
# client kind id as the authority; the heuristic remains only as a fallback
# for older or incomplete table extracts.
PLAYER_PASSIVE_ICON_BY_KIND = {
    1: "attack_icon",
    **{kind: "PassiveBigIcon_BulletDMG" for kind in (2, 7, 8, 9, 10, 11, 32, 33, 34, 35, 36, 52, 53, 54, 55, 56, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96)},
    **{kind: "PassiveBigIcon_AttackSpeed" for kind in (3, 17, 18, 19, 20, 21, 42, 43, 44, 45, 46, 62, 63, 64, 65, 66)},
    **{kind: "PassiveBigIcon_CriticalDMG" for kind in (4, 12, 13, 14, 15, 16, 37, 38, 39, 40, 41, 57, 58, 59, 60, 61)},
    **{kind: "PassiveBigIcon_Spup" for kind in (5, 97, 98, 99, 100, 101)},
    **{kind: "PassiveBigIcon_HPup" for kind in (6, 102, 103, 104, 105, 106)},
    **{kind: "PassiveBigIcon_CriticalRate" for kind in (22, 23, 24, 25, 26, 47, 48, 49, 50, 51, 67, 68, 69, 70, 71)},
    27: "PassiveBigIcon_Invasion",
    28: "PassiveBigIcon_Guardian",
    29: "PassiveBigIcon_Engineering",
    30: "PassiveBigIcon_Magic",
    31: "PassiveBigIcon_Nature",
    72: "PassiveBigIcon_Invasion",
    73: "PassiveBigIcon_Guardian",
    74: "PassiveBigIcon_Engineering",
    75: "PassiveBigIcon_Magic",
    76: "PassiveBigIcon_Nature",
    77: "PassiveBigIcon_Invasion",
    78: "PassiveBigIcon_Guardian",
    79: "PassiveBigIcon_Engineering",
    80: "PassiveBigIcon_Magic",
    81: "PassiveBigIcon_Nature",
    107: "PassiveBigIcon_Surport_N",
    108: "PassiveBigIcon_Surport_E",
    109: "PassiveBigIcon_Surport_M",
    110: "PassiveBigIcon_Surport_G",
    111: "PassiveBigIcon_Surport_I",
}


def player_passive_icon_candidates(kind_id: int | str | None) -> list[str]:
    try:
        kind = int(str(kind_id or "0"))
    except (TypeError, ValueError):
        return []
    icon_name = PLAYER_PASSIVE_ICON_BY_KIND.get(kind)
    return [icon_name] if icon_name else []


def center_stats_for_nodes(nodes: list[dict[str, object]]) -> dict[int, tuple[str, str, str]]:
    """Return the five centre labels using the full branch node counts.

    ``DiceTreeNodeTable`` is the authoritative client-side topology.  Counting
    its rows by branch gives the number shown for a completely unlocked branch;
    it deliberately includes dice, runes, player passives and perks rather
    than confusing node count with a node's upgrade rank or account progress.
    """
    counts = Counter(int(node["branch"]) for node in nodes)
    return {
        branch: (name, str(counts.get(branch, 0)), color)
        for branch, (name, color) in TREE_CENTER_GROUPS.items()
    }

# The five faint emblems behind the account progress numbers are not passive
# icons.  They are the dedicated branch-group sprites from the client UI.
# Keeping these separate from the node/passive icon map avoids substituting a
# purple PassiveBigIcon for the tree's leaf, gear, book, shield or claw mark.
TREE_CENTER_DIMS = {
    1: "icon_group_nature",
    2: "icon_group_engineering",
    3: "icon_group_magic",
    4: "icon_group_guardian",
    5: "icon_group_invasion",
}

# The asset bundle contains several similarly named effect and rune sprites.
# Keep the tree's icon selection explicit so an effect icon can never silently
# replace a dice icon just because it happens to share a keyword.
DICE_ICON_ALIASES = {
    "Fire": ["Dice_fire2"],
    "Ice": ["Dice_ICE2"],
    "Electric": ["Dice_Electric2"],
    "Wind": ["Dice_Wind2"],
    "Iron": ["Dice_iron_2", "Dice_iron2"],
    "Light": ["Dice_Light2"],
    "Poison": ["Dice_Poison2"],
    "Trap": ["Dice_Thorn2"],
    "Pillar": ["Dice_Pillar2"],
    "Lock": ["Dice_Lock2"],
    "Mine": ["Dice_Mine2"],
    "Energy": ["Dice_Energy2"],
    # These two families use standalone *_Icon names rather than Dice_*2
    # crops in this client bundle; they are still complete family assets.
    "Burn": ["Burn_Icon"],
    "Joker": ["Dice_Joker2"],
    "Shuriken": ["Dice_shuriken2"],
    "Stone": ["Dice_STONE_2"],
    "Switch": ["Dice_Switch2"],
    "BrokenGrowth": ["Dice_BrokenGrowth2"],
    "Gear": ["Dice_Gear2"],
    "Element": ["Dice_Element2"],
    "Combo": ["Dice_Combo2"],
    "Adjust": ["Dice_Adjust2"],
    "SpGemstone": ["spgemstone1"],
    "Altar": ["altar1"],
    "Summon": ["Dice_summon2"],
    "Hammer": ["hammer_icon"],
    "Neon": ["Dice_Neon2"],
    "SawBlade": ["Dice_SawBlade2"],
    "Potion": ["Dice_Potion2"],
    "Ray": ["Dice_Ray2"],
    "Punch": ["Dice_Punch2"],
    "Germ": ["Dice_Germ2"],
    "Flow": ["Dice_FLOW2"],
    "Bubble": ["Dice_BUBBLE2"],
    "SpeedGun": ["Dice_SPEEDGUN2"],
    "Slow": ["Dice_Slow2"],
    "Royal": ["Dice_ROYAL2"],
    "Ax": ["Dice_Ax2"],
    "Bomb": ["dice_bomb2"],
    # The client tree renders the localized Void Dice with the SPEEDGUN card
    # artwork in this snapshot.
    "Death": ["Dice_SPEEDGUN2"],
    # Greed's tree icon is named after the Slow family in this client.
    "Box": ["Dice_Slow2"],
    "Bingo": ["Dice_BINGO2"],
    "Sniper": ["Dice_Sniper2"],
    "Executioner": ["Dice_Executioner2"],
    "Alignment": ["Dice_Alignment2", "Dice_Alignment3"],
    "Solitude": ["Dice_Solitude_2"],
    "Tyrant": ["Dice_Tyrant2"],
    "Predator": ["Dice_Predator2"],
    "Mutation": ["Dice_Mutation2"],
    "Resonance": ["Dice_Resonance2"],
    "Blessing": ["Dice_Blessing2"],
    "Doom": ["Dice_Doom2"],
    "Flower": ["Dice_Flower2"],
    # The client names these two dice after their projectile families rather
    # than their localized names: Fear uses TRANSFER and Decay uses Crack.
    "Fear": ["Dice_TRANSFER2"],
    "Decay": ["Dice_Crack2"],
}

UNLOCK_ZH = {
    "": "前置節點",
    "LV_Nature": "自然等級",
    "LV_Engineering": "工程等級",
    "LV_Magic": "魔法等級",
    "REWARD_UNLOCKED": "領取獎勵後解鎖",
    "COOP_KILL_COUNT": "合作擊殺數",
    "COOP_REWARD_UNLOCKED": "合作獎勵解鎖",
    "ARENA_REWARD_UNLOCKED": "競技場獎勵解鎖",
}

def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def load_localization(path: Path) -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {}
    for row in read_csv(path):
        key = row.get("", "")
        if not key:
            continue
        result[key] = {lang: row.get(lang, "") for lang in ("ko", "en", "ja", "zh-tw")}
    return result


def as_int_list(value: str) -> list[int]:
    if not value:
        return []
    result: list[int] = []
    for part in value.split("|"):
        try:
            result.append(int(float(part)))
        except ValueError:
            result.append(0)
    return result


def localize(loc: dict[str, dict[str, str]], key: str) -> str:
    if not key:
        return ""
    return loc.get(key, {}).get("zh-tw", "") or loc.get(key, {}).get("en", "") or key


def short_label(value: str, limit: int = 7) -> str:
    value = value.replace("<br>", " ").replace("<tag>", "").replace("</tag>", "")
    value = " ".join(value.split())
    return value if len(value) <= limit else value[: limit - 1] + "…"


def format_effect_value(value: object) -> str:
    """Format table values without exposing CSV floating-point noise."""
    text = str(value or "").strip()
    if not text:
        return ""
    try:
        number = float(text)
    except ValueError:
        return text
    # The client tables encode reductions as negative magnitudes for some
    # rune families (for example cooldown reduction).  The localized string
    # already supplies the semantic word "減少", so exposing the raw minus
    # sign would produce the incorrect-looking "減少-0.5秒".
    number = abs(number)
    if number.is_integer():
        return str(int(number))
    return f"{number:.4f}".rstrip("0").rstrip(".")


# These are the client's own Traditional-Chinese tag names.  Keeping the
# mapping in one place avoids partially translating descriptions (for example
# leaving STUN/RESONANCE/slow in English while the rest is localized).
EFFECT_TAG_ZH = {
    "EFFECT_DEATH": "暴斃",
    "BULLET": "子彈",
    "CHAIN": "連鎖",
    "AURA": "光環",
    "CHARGE": "補充",
    "AREA_DAMAGE": "範圍傷害",
    "PILLAR": "巨石",
    "FROZEN": "冰凍",
    "BURN": "燙傷",
    "LOCK": "封印",
    "POISON": "毒素",
    "DECAY": "腐敗",
    "SP_GAIN": "獲得SP",
    "SP_SCALE": "SP等比",
    "SP_BURN": "燒毀",
    "BUFF_ATKSPD": "攻擊速度增加",
    "DEBUFF_ATKSPD": "攻擊速度減少",
    "BUBBLE": "泡泡",
    "MERGE": "合成時",
    "SPAWN": "召喚時",
    "SUMMON": "召喚",
    "COPY": "複製",
    "SWAP": "替換",
    "GROWTH": "成長",
    "POTION": "藥水",
    "ACTIVATION": "啟用條件",
    "CONNECT": "連接",
    "ELEMENT": "原子",
    "COMBO": "連擊",
    "STONE": "石頭",
    "THORN": "尖刺",
    "SAW": "鋸齒",
    "THUNDERHAMMER": "雷錘",
    "LASER": "光線",
    "SHURIKEN": "魔彈",
    "FLOW": "流動",
    "SLOW": "虛脫",
    "slow": "虛脫",
    "STUN": "僵硬",
    "STUN暈眩": "僵硬",
    "BIGTHORN": "巨型尖刺",
    "OVERSHURIKEN": "強化魔彈",
    "COUNTDOWN": "倒數",
    "EXECUTIONER": "執行劍",
    "ALIGNMENT": "排序",
    "ALONE": "孤獨",
    "TYRANT": "暴君化",
    "PREDATOR": "吞噬",
    "MUTATION": "變種",
    "FAILURE": "失敗品",
    "RESONANCE": "共鳴",
    "DOOM": "破滅",
    "NORMAL_MONSTER": "一般怪物",
    "ELITE_MONSTER": "菁英怪物",
    "SPEED_MONSTER": "快速怪物",
    "BIG_MONSTER": "巨大怪物",
    "BOSS_MONSTER": "首領怪物",
    "GOLEM_MONSTER": "SP魔像",
    "BLOOM": "綻放",
    "BLESS": "祝福",
    "SOW": "果實",
    "TRANSFER": "SP怪物",
    "TAEGEUK": "陰陽",
    "HARMONY": "極致和諧",
}


def clean_effect_text(value: object, substitutions: list[object] | None = None) -> str:
    """Turn client-localized rich text into compact guide-facing prose."""
    text = str(value or "")
    values = [format_effect_value(item) for item in (substitutions or [])]

    def has_value(index: int) -> bool:
        return 0 <= index < len(values) and bool(values[index])

    # A few max-rank-one rows retain the shared rank-up color span even though
    # the table has no rank-add value.  The client hides that whole span; do
    # the same instead of exposing a misleading question mark.
    def remove_unresolved_color(match: re.Match[str]) -> str:
        segment = match.group(0)
        indices = [int(item) for item in re.findall(r"\{(\d+)\}", segment)]
        return "" if any(not has_value(index) for index in indices) else segment

    text = re.sub(
        r"<color=[^>]+>.*?</color>",
        remove_unresolved_color,
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )

    def replace_placeholder(match: re.Match[str]) -> str:
        index = int(match.group(1))
        return values[index] if has_value(index) else ""

    text = re.sub(r"\{(\d+)\}", replace_placeholder, text)
    # Rank-up values are shown as an explicit increase amount in the guide,
    # rather than the ambiguous client shorthand "(+x)".
    text = re.sub(r"\(\s*\+\s*([^()\n]+?)\s*\)", r"（每級增加\1）", text)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<color=[^>]+>|</color>", "", text, flags=re.IGNORECASE)

    def replace_tag(match: re.Match[str]) -> str:
        token = match.group(1)
        return EFFECT_TAG_ZH.get(token, EFFECT_TAG_ZH.get(token.upper(), token))

    text = re.sub(r"<tag>(.*?)</tag>", replace_tag, text, flags=re.IGNORECASE)
    text = re.sub(r"</?[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r"[ \t]*\n[ \t]*", "\n", text)
    text = text.strip()
    # The source uses a plus sign in a few non-rank phrases.  Preserve the
    # wording while expressing the amount as "增加" like the in-game Chinese.
    text = re.sub(r"骰點\+(?=\d)", "骰點增加", text)
    text = re.sub(r"骰點-(?=\d)", "骰點減少", text)
    text = text.replace("傷害+失去", "傷害增加失去")
    return text


def guide_effect_text(node: dict[str, object]) -> str:
    """Return one readable, value-expanded effect line for an annotated node."""
    node_type = str(node.get("node_type", ""))
    if node_type == "DICE_RUNE":
        values = [
            node.get("rune_value1", ""),
            node.get("rune_value1_rank_add", ""),
            node.get("rune_value2", ""),
            node.get("rune_value2_rank_add", ""),
            node.get("rune_duration", ""),
            node.get("rune_duration_rank_add", ""),
        ]
        # These two client strings use {1} for Value2 (the stack amount), not
        # Value1_RankAdd.  Resolve that table-specific convention before the
        # generic placeholder expansion.
        if str(node.get("rune_kind", "")) in {"TyrantConsumeDmgPerStack", "BonusPredatorChance"} and not values[1]:
            values[1] = node.get("rune_value2", "")
    elif node_type == "PLAYER_PASSIVE":
        values = [node.get("passive_value", ""), node.get("passive_rank_add", "")]
    else:
        values = []
    effect = clean_effect_text(node.get("description_zh", ""), values)
    if node_type == "DICE":
        attack = format_effect_value(node.get("dice_attack", ""))
        interval = format_effect_value(node.get("dice_attack_interval", ""))
        stats = []
        if attack:
            stats.append(f"攻擊 {attack}")
        if interval:
            stats.append(f"間隔 {interval} 秒")
        if stats:
            effect = f"{effect}（{'；'.join(stats)}）" if effect else "；".join(stats)
    for source, target in EFFECT_TAG_ZH.items():
        effect = effect.replace(source, target)
    return effect or "效果資料未提供"


def guide_node_kind(node: dict[str, object]) -> str:
    """Use concise labels that distinguish the four tree node families."""
    return {
        "DICE": "骰子",
        "PERK": "支援",
        "DICE_RUNE": "節點",
        "PLAYER_PASSIVE": "節點",
    }.get(str(node.get("node_type", "")), "節點")


def guide_display_name(node: dict[str, object]) -> str:
    """Keep the visible title to the actual localized node name."""
    return str(node.get("name_zh", "節點"))


def wrap_guide_text(value: str, max_chars: int, max_lines: int) -> list[str]:
    """Wrap CJK/Latin effect text without relying on browser text layout."""
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return [""]
    lines: list[str] = []
    remaining = False
    for paragraph_index, paragraph in enumerate(text.split("\n")):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        while paragraph and len(lines) < max_lines:
            if len(paragraph) <= max_chars:
                lines.append(paragraph)
                paragraph = ""
                break
            cut = max_chars
            for separator in ("；", "，", "、", " "):
                position = paragraph.rfind(separator, 0, max_chars + 1)
                if position >= max_chars // 2:
                    cut = position + 1
                    break
            lines.append(paragraph[:cut].strip())
            paragraph = paragraph[cut:].strip()
        if paragraph or paragraph_index < len(text.split("\n")) - 1 and len(lines) >= max_lines:
            remaining = True
            break
    if remaining and lines:
        last = lines[-1]
        lines[-1] = (last[: max(1, max_chars - 1)] + "…")
    return lines or [""]


def icon_lookup(manifest: dict[str, dict[str, object]], candidates: Iterable[str]) -> dict[str, object] | None:
    for candidate in candidates:
        hit = manifest.get(candidate.lower())
        if hit:
            return hit
    return None


def dice_icon_candidates(defender_type: str) -> list[str]:
    candidates = DICE_ICON_ALIASES.get(defender_type, [])[:]
    # The game's profile/tree UI normally uses the middle (2) artwork; keep
    # 1/3 only as compatibility fallbacks for families without a 2 crop.
    candidates.extend([f"Dice_{defender_type}2", f"Dice_{defender_type}_2", f"Dice_{defender_type}1", f"Dice_{defender_type}_1", f"Dice_{defender_type}3"])
    return candidates


def rune_icon_candidates(
    rune_dice: str,
    rune_kind: str,
    rune_id: int | str | None = None,
) -> list[str]:
    """Return the three-art family in the same order as ``RuneTable``.

    Each defender type owns three rune rows.  The extracted client assets keep
    those rows as ``Runenode_<family>_0``, ``_1`` and ``_2``; choosing ``_0``
    for every row loses the individual effect glyph.  The current table stores
    the three rows consecutively, so the row id gives the stable variant index.
    Keep the other two variants as fallbacks for older/incomplete extractions.
    """
    token_aliases = {
        "Electric": "Electricity", "Trap": "Thorn", "Stone": "Rock", "BrokenGrowth": "Grow",
        "Executioner": "Execution", "Alignment": "Align", "SawBlade": "Saw", "SpeedGun": "SpeedGun",
        "Shuriken": "Bullet", "SpGemstone": "SP", "Summon": "Summon", "Bingo": "Bingo",
        "Element": "Atom", "Pillar": "Rock", "Punch": "Judgement",
    }
    token = token_aliases.get(rune_dice, rune_dice)
    if not token:
        return []

    preferred: int | None = None
    try:
        parsed_id = int(str(rune_id or "0"))
        if parsed_id > 0:
            # RuneTable is grouped as three consecutive rows per dice.
            preferred = (parsed_id - 1) % 3
    except (TypeError, ValueError):
        preferred = None

    variants = ([preferred] + [v for v in (0, 1, 2) if v != preferred]) if preferred is not None else [0, 1, 2]
    return [f"Runenode_{token}_{variant}" for variant in variants]


def passive_category(passive_id: str) -> str:
    """Return the client asset category for a player passive."""
    # The engineering SP-discount passive is a branch-specific upgrade icon,
    # not the account-start SP sword.  Keep the explicit exception before the
    # broad ``SP`` check below (the table id contains those letters).
    if "UpgradeSPDiscount" in passive_id:
        return "Engineering"
    if "AtkSpeed" in passive_id or "AttackSpeed" in passive_id:
        return "AttackSpeed"
    if "CritDmg" in passive_id:
        return "CriticalDMG"
    if "CritPer" in passive_id or "CriticalRate" in passive_id:
        return "CriticalRate"
    if "Attack" in passive_id or "BulletDMG" in passive_id:
        return "BulletDMG"
    if "StartSp" in passive_id or "SP" in passive_id:
        return "SPUp"
    if "StartHp" in passive_id or "HP" in passive_id:
        return "HPUp"
    if "Reroll" in passive_id:
        return "Reroll"
    if "Tsunami" in passive_id:
        return "Tsunami"
    if "Trash" in passive_id:
        return "Trashcan"
    return "Special"


def passive_icon_candidates(passive_id: str, passive_group: str) -> list[str]:
    # Common "all dice" passives are serialized with the literal group
    # `None`; they still use the neutral/Nature passive art rather than the
    # disabled placeholder.  Treat the other null spellings the same way.
    normalized_group = str(passive_group or "").strip()
    if normalized_group.casefold() in {"", "none", "null", "0"}:
        normalized_group = "Nature"
    group = {"Invader": "Invasion"}.get(normalized_group, normalized_group)
    category = passive_category(passive_id)
    # The regular Passive_* family contains the complete branch-coloured
    # sprite used by special/support nodes.  Categories without a dedicated
    # regular sprite (for example Engineering/Guardian Special effects) use
    # the branch's Special art rather than falling through to a generic glyph.
    regular_categories = {
        "AttackSpeed",
        "BulletDMG",
        "CriticalDMG",
        "CriticalRate",
        "HPUp",
        "SPUp",
        "Reroll",
        "Tsunami",
        "Trashcan",
        "Special",
    }
    regular_category = category if category in regular_categories else "Special"
    return [f"Passive_{group}_{regular_category}", f"Passive_{group}_BG"]


def passive_big_icon_candidates(passive_id: str, passive_group: str) -> list[str]:
    """Return the monochrome glyphs used inside a blue/pink passive node.

    The client uses the ``PassiveBigIcon_*`` family for both common stats and
    branch-specific/special small nodes; the regular ``Passive_*`` sprites
    are complete branch-coloured circles and are only a fallback for missing
    glyph assets.
    """
    category = passive_category(passive_id)
    category_alias = {"SPUp": "Spup", "HPUp": "HPup"}.get(category, category)
    normalized_group = str(passive_group or "").strip()
    if normalized_group.casefold() in {"", "none", "null", "0"}:
        normalized_group = "Nature"
    group = {"Invader": "Invasion"}.get(normalized_group, normalized_group)
    # These nodes are still rendered with the shared blue/pink badge.  Their
    # glyph, however, is effect-specific rather than one of the common stat
    # glyphs.  Match the extracted client assets explicitly; V2/V3 rows are
    # the same passive at a higher rank and therefore reuse the same glyph.
    special_icon_by_prefix = {
        "NatureMergeLevelUpBonus": "PassiveBigIcon_Nature",
        "EngineeringUpgradeSPDiscount": "PassiveBigIcon_Engineering",
        "InvaderSummonDefenderOnMerge": "PassiveBigIcon_Invasion",
        "GuardianDefenderPowerUpChain": "PassiveBigIcon_Guardian",
        "MagicSpawnLevel2DefenderOnSpawn": "PassiveBigIcon_Magic",
        "TrashDelay01": "PassiveBigIcon_Surport_N",
        "RerollDelay01": "PassiveBigIcon_Surport_E",
        "TsunamiDelay01": "PassiveBigIcon_Surport_M",
        # Cannon and Lava have no named effect glyph in the extracted set;
        # their support-character glyphs are the corresponding client art.
        "CannonDelay01": "PassiveBigIcon_Surport_G",
        "LavaDelay01": "PassiveBigIcon_Surport_I",
    }
    special_candidates = [
        icon_name
        for prefix, icon_name in special_icon_by_prefix.items()
        if passive_id == prefix or passive_id.startswith(f"{prefix}V")
    ]
    return special_candidates + [
        f"PassiveBigIcon_{category_alias}",
        f"PassiveBigIcon_{group}",
    ]


def assign_icons(root: Path, nodes: list[dict[str, object]]) -> int:
    manifest_path = root / "sprites_manifest.json"
    if not manifest_path.exists():
        return 0
    entries = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest: dict[str, dict[str, object]] = {}
    for entry in entries:
        key = str(entry.get("name", "")).lower()
        if not key or not entry.get("file"):
            continue
        # Full extraction keeps same-name variants. Guide generation should
        # continue using the canonical (largest) image instead of whichever
        # variant happened to be last in the JSON list.
        previous = manifest.get(key)
        if previous is None or (entry.get("canonical", False) and not previous.get("canonical", False)):
            manifest[key] = entry
    matched = 0
    for node in nodes:
        icon = None
        if node["node_type"] == "DICE":
            icon = icon_lookup(manifest, dice_icon_candidates(str(node.get("dice_type", ""))))
        elif node["node_type"] == "DICE_RUNE":
            icon = icon_lookup(
                manifest,
                rune_icon_candidates(
                    str(node.get("rune_dice", "")),
                    str(node.get("rune_kind", "")),
                    node.get("kind_id"),
                ),
            )
            if icon and str(icon.get("name", "")).lower() == "runenode_disabled_00":
                icon = None
        elif node["node_type"] == "PLAYER_PASSIVE":
            passive_id = str(node.get("passive_id", ""))
            passive_group = str(node.get("passive_group", ""))
            # PlayerPassiveIconDict is the client's authoritative kind-id to
            # glyph mapping.  Resolve it before the name/category heuristic;
            # the latter is only a compatibility fallback for incomplete
            # extracts and previously swapped several summon/support glyphs.
            icon = icon_lookup(manifest, player_passive_icon_candidates(node.get("kind_id")))
            if icon is None:
                icon = icon_lookup(manifest, passive_big_icon_candidates(passive_id, passive_group))
            if icon is None:
                icon = icon_lookup(manifest, passive_icon_candidates(passive_id, passive_group))
        elif node["node_type"] == "PERK":
            perk_aliases = {"Trash": "Perk_Trash_Profile", "Reroll": "Perk_Change_Profile", "Tsunami": "Perk_Tsunami_Profile", "Cannon": "Perk_Cannon_Profile", "Lava": "Perk_Lava_Profile"}
            icon = icon_lookup(manifest, [perk_aliases.get(str(node.get("perk_type", "")), "")])
        if icon:
            node["icon_name"] = icon["name"]
            node["icon_file"] = icon["file"]
            node["icon_status"] = "sprite"
            matched += 1
        else:
            node["icon_name"] = ""
            node["icon_file"] = ""
            node["icon_status"] = "svg-fallback"
    return matched


def file_data_uri(root: Path, relative_file: str) -> str:
    """Return an embedded PNG URI for an extracted asset, if present."""
    if not relative_file:
        return ""
    path = root / relative_file
    if not path.is_file():
        return ""
    try:
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    except OSError:
        return ""
    return f"data:image/png;base64,{encoded}"


def icon_data_uri(root: Path, node: dict[str, object]) -> str:
    """Return an embedded PNG URI for a node's extracted sprite, if present."""
    return file_data_uri(root, str(node.get("icon_file", "")))


def sprite_file_lookup(root: Path) -> dict[str, str]:
    """Map Unity Sprite names to their extracted relative PNG paths."""
    manifest_path = root / "sprites_manifest.json"
    if not manifest_path.is_file():
        return {}
    try:
        entries = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    chosen: dict[str, dict[str, object]] = {}
    for entry in entries:
        key = str(entry.get("name", "")).casefold()
        file = str(entry.get("file", ""))
        if not key or not file:
            continue
        previous = chosen.get(key)
        if previous is None or (entry.get("canonical", False) and not previous.get("canonical", False)):
            chosen[key] = entry
    return {key: str(entry.get("file", "")) for key, entry in chosen.items()}


def register_asset_symbol(root: Path, parts: list[str], refs: dict[str, str], relative_file: str) -> str:
    """Embed one extracted PNG as a reusable SVG symbol and return its href."""
    if not relative_file:
        return ""
    if relative_file in refs:
        return refs[relative_file]
    data_uri = file_data_uri(root, relative_file)
    if not data_uri:
        return ""
    symbol_id = f"sprite-{len(refs) + 1}"
    refs[relative_file] = f"#{symbol_id}"
    safe_uri = html.escape(data_uri, quote=True)
    parts.append(
        f'<symbol id="{symbol_id}" viewBox="0 0 1 1"><image href="{safe_uri}" '
        f'xlink:href="{safe_uri}" x="0" y="0" width="1" height="1" '
        'preserveAspectRatio="xMidYMid meet"/></symbol>'
    )
    return refs[relative_file]


def register_asset_symbol_stretched(root: Path, parts: list[str], refs: dict[str, str], relative_file: str) -> str:
    """Embed a UI sprite whose RectTransform intentionally changes its aspect ratio.

    Most game icons must stay proportional, so ``register_asset_symbol`` uses
    ``xMidYMid meet``.  ``DiceTreeBase`` is a nine-sliced UI frame in the
    client: its 234x160 source sprite is laid out as a 480x285 panel.  Keep a
    separate symbol with ``preserveAspectRatio=none`` for that one exact use.
    """
    if not relative_file:
        return ""
    cache_key = f"{relative_file}::stretched"
    if cache_key in refs:
        return refs[cache_key]
    data_uri = file_data_uri(root, relative_file)
    if not data_uri:
        return ""
    symbol_id = f"sprite-{len(refs) + 1}"
    refs[cache_key] = f"#{symbol_id}"
    safe_uri = html.escape(data_uri, quote=True)
    # ``preserveAspectRatio`` on a ``use`` element does not override the
    # meet policy of the referenced symbol's viewBox.  DiceTreeBase is
    # deliberately non-uniformly stretched by the client RectTransform, so
    # the policy must live on the symbol as well; otherwise the 234x160
    # source panel is letterboxed into a square viewport.
    parts.append(
        f'<symbol id="{symbol_id}" viewBox="0 0 1 1" preserveAspectRatio="none"><image href="{safe_uri}" '
        f'xlink:href="{safe_uri}" x="0" y="0" width="1" height="1" '
        'preserveAspectRatio="none"/></symbol>'
    )
    return refs[cache_key]


def branch_for(node_id: str) -> int:
    return int(node_id) // 1000


def node_meta(
    row: dict[str, str],
    dice: list[dict[str, str]],
    passives: list[dict[str, str]],
    runes: dict[str, dict[str, str]],
    perks: list[dict[str, str]],
    loc: dict[str, dict[str, str]],
) -> dict[str, object]:
    node_type = row["NodeType"]
    kind_id = int(row["KindId"] or 0)
    name = ""
    desc = ""
    extra: dict[str, object] = {}
    if node_type == "DICE" and 1 <= kind_id <= len(dice):
        data = dice[kind_id - 1]
        name = data.get("zh_tw_local_fullname") or data.get("zh_tw_local_name") or data.get("DefenderType", "")
        desc = data.get("zh_tw_local_desc", "")
        extra.update({
            "dice_type": data.get("DefenderType", ""),
            "dice_group": data.get("DefenderGroupType", ""),
            "dice_attack": data.get("Attack", ""),
            "dice_attack_interval": data.get("AttackInterval", ""),
            "dice_awaken": data.get("zh_tw_local_lv7", ""),
        })
    elif node_type == "PLAYER_PASSIVE" and 1 <= kind_id <= len(passives):
        data = passives[kind_id - 1]
        name = localize(loc, data.get("Local_Name", ""))
        desc = localize(loc, data.get("Local_Desc", ""))
        extra.update({
            "passive_id": data.get("StringId", ""),
            "passive_group": data.get("DefenderGroupType", ""),
            "passive_value": data.get("Value", ""),
            "passive_rank_add": data.get("Value_RankAdd", ""),
        })
    elif node_type == "DICE_RUNE":
        data = runes.get(str(kind_id), {})
        name = localize(loc, data.get("Local_Name", "")) or f"符文 {kind_id}"
        desc = localize(loc, data.get("Local_Desc", ""))
        extra.update({
            "rune_kind": data.get("Kind", ""),
            "rune_grade": data.get("Grade", ""),
            "rune_dice": data.get("DefenderType", ""),
            "rune_value1": data.get("Value1", ""),
            "rune_value1_rank_add": data.get("Value1_RankAdd", ""),
            "rune_value2": data.get("Value2", ""),
            "rune_value2_rank_add": data.get("Value2_RankAdd", ""),
            "rune_duration": data.get("Duration", ""),
            "rune_duration_rank_add": data.get("Duration_RankAdd", ""),
        })
    elif node_type == "PERK" and 1 <= kind_id <= len(perks):
        data = perks[kind_id - 1]
        name = localize(loc, data.get("Local_Name", ""))
        desc = localize(loc, data.get("Local_Desc", ""))
        extra.update({"perk_type": data.get("PerkActionType", ""), "perk_group": data.get("DefenderGroupType", "")})

    gold = as_int_list(row.get("RankUpGoldArr", ""))
    core = as_int_list(row.get("RankUpStoneArr", ""))
    max_rank = max(len(gold), len(core), 1)
    next_nodes = [value for value in row.get("NextNodes", "").split("|") if value]
    meta: dict[str, object] = {
        "id": row["Id"],
        "index": int(row["Index"] or 0),
        "branch": branch_for(row["Id"]),
        "branch_zh": BRANCH_ZH.get(branch_for(row["Id"]), f"分支 {branch_for(row['Id'])}"),
        "node_type": node_type,
        "node_type_zh": NODE_TYPE_ZH.get(node_type, node_type),
        "kind_id": kind_id,
        "name_zh": name or f"{NODE_TYPE_ZH.get(node_type, node_type)} {kind_id}",
        "description_zh": desc,
        "short_label": short_label(name or f"{kind_id}"),
        "x": float(row["Position"].split("|")[0]),
        "y": float(row["Position"].split("|")[1]),
        "is_big": row.get("IsBig") == "True",
        "is_base": row.get("IsBase") == "True",
        "is_show": row.get("IsShow") == "True",
        "unlock_condition": row.get("UnlockCond", ""),
        "unlock_condition_zh": UNLOCK_ZH.get(row.get("UnlockCond", ""), row.get("UnlockCond", "")),
        "unlock_condition_value": row.get("UnlockCondValue", ""),
        "next_nodes": next_nodes,
        "incoming": [],
        "gold_costs": gold,
        "core_costs": core,
        "max_rank": max_rank,
        "unlock_gold": gold[0] if gold else 0,
        "unlock_core": core[0] if core else 0,
        "total_gold": sum(gold),
        "total_core": sum(core),
    }
    meta.update(extra)
    return meta


def load_nodes(root: Path) -> tuple[list[dict[str, object]], dict[str, object]]:
    table_dir = root / "tables"
    loc = load_localization(root / "localization_text.csv")
    dice = read_csv(root / "dice_catalog.csv")
    passives = read_csv(table_dir / "PlayerPassiveTable.csv")
    rune_rows = read_csv(table_dir / "RuneTable.csv")
    runes = {row.get("Id", ""): row for row in rune_rows}
    perks = read_csv(table_dir / "PerkActionTable.csv")
    rows = read_csv(table_dir / "DiceTreeNodeTable.csv")
    nodes = [node_meta(row, dice, passives, runes, perks, loc) for row in rows]
    icon_matches = assign_icons(root, nodes)
    by_id = {str(node["id"]): node for node in nodes}
    for node in nodes:
        for child in node["next_nodes"]:  # type: ignore[union-attr]
            if child in by_id:
                by_id[child]["incoming"].append(node["id"])  # type: ignore[union-attr]
    edges = [{"from": node["id"], "to": child} for node in nodes for child in node["next_nodes"]]  # type: ignore[union-attr]
    summary = {
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes_by_type": dict(Counter(str(node["node_type"]) for node in nodes)),
        "nodes_by_branch": dict(Counter(str(node["branch"]) for node in nodes)),
        "full_unlock_nodes_by_branch": {
            str(branch): int(count)
            for branch, (_, count, _) in center_stats_for_nodes(nodes).items()
        },
        "total_unlock_gold": sum(int(node["unlock_gold"]) for node in nodes),
        "total_unlock_core": sum(int(node["unlock_core"]) for node in nodes),
        "total_max_gold": sum(int(node["total_gold"]) for node in nodes),
        "total_max_core": sum(int(node["total_core"]) for node in nodes),
        "icon_matches": icon_matches,
        "icon_fallbacks": len(nodes) - icon_matches,
        "note": "Derived from Random Dice 2 iOS 1.0.0 client assets; centre values count all fully unlocked DiceTreeNodeTable rows in each branch.",
    }
    return nodes, {"summary": summary, "edges": edges}


def load_rune_catalog(root: Path, nodes: list[dict[str, object]]) -> list[dict[str, object]]:
    """Load every RuneTable row, including rows not currently wired into DiceTreeNodeTable.

    The active tree contains only 123 of the 153 client rune definitions.  Keeping the
    complete table separate from the topology prevents us from inventing edges while
    still making the otherwise hidden rune families available to the guide author.
    """
    loc = load_localization(root / "localization_text.csv")
    rune_rows = read_csv(root / "tables" / "RuneTable.csv")
    tree_ids = {
        int(node["kind_id"])
        for node in nodes
        if node.get("node_type") == "DICE_RUNE"
    }
    manifest_path = root / "sprites_manifest.json"
    entries = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
    manifest: dict[str, dict[str, object]] = {}
    for entry in entries:
        key = str(entry.get("name", "")).lower()
        if not key or not entry.get("file"):
            continue
        previous = manifest.get(key)
        if previous is None or (entry.get("canonical", False) and not previous.get("canonical", False)):
            manifest[key] = entry
    catalog: list[dict[str, object]] = []
    for row in rune_rows:
        rune_id = int(row.get("Id", "0") or 0)
        rune_dice = row.get("DefenderType", "")
        rune_kind = row.get("Kind", "")
        icon = icon_lookup(manifest, rune_icon_candidates(rune_dice, rune_kind, rune_id))
        if icon and str(icon.get("name", "")).lower() == "runenode_disabled_00":
            icon = None
        icon_status = "rune-sprite"
        if icon is None:
            icon = icon_lookup(manifest, dice_icon_candidates(rune_dice))
            icon_status = "dice-fallback" if icon else "unmatched"
        catalog.append({
            "id": rune_id,
            "kind": rune_kind,
            "rune_dice": rune_dice,
            "name_zh": localize(loc, row.get("Local_Name", "")) or rune_kind,
            "description_zh": localize(loc, row.get("Local_Desc", "")),
            "grade": row.get("Grade", ""),
            "use": row.get("Use", ""),
            "max_rank": int(row.get("MaxRank", "0") or 0),
            "in_tree": rune_id in tree_ids,
            "icon_name": icon.get("name", "") if icon else "",
            "icon_file": icon.get("file", "") if icon else "",
            "icon_status": icon_status,
        })
    return catalog


def write_nodes(root: Path, nodes: list[dict[str, object]], edges: list[dict[str, object]], summary: dict[str, object]) -> None:
    fields = [
        "id", "index", "branch", "branch_zh", "node_type", "node_type_zh", "kind_id", "name_zh",
        "description_zh", "x", "y", "is_big", "is_base", "is_show", "unlock_condition_zh",
        "unlock_condition_value", "max_rank", "unlock_gold", "unlock_core", "total_gold", "total_core",
        "incoming", "next_nodes", "dice_type", "dice_group", "dice_attack", "dice_attack_interval",
        "dice_awaken", "passive_id", "passive_group", "rune_kind", "rune_grade", "rune_dice",
        "perk_type", "perk_group", "icon_name", "icon_file", "icon_status",
    ]
    csv_path = root / "dice_tree_nodes.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        for node in nodes:
            row = dict(node)
            row["incoming"] = "|".join(str(value) for value in node["incoming"])
            row["next_nodes"] = "|".join(str(value) for value in node["next_nodes"])
            writer.writerow(row)
    with (root / "dice_tree_edges.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["from", "to"], lineterminator="\n")
        writer.writeheader()
        writer.writerows(edges)
    payload = {"summary": summary, "nodes": nodes, "edges": edges}
    (root / "dice_tree.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (root / "dice_tree_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fmt_cost(node: dict[str, object]) -> str:
    gold = int(node["unlock_gold"])
    core = int(node["unlock_core"])
    values: list[str] = []
    if gold:
        values.append(f"金幣 {gold:,}")
    if core:
        values.append(f"核心 {core:,}")
    return "／".join(values) or "無初始費用"


def write_markdown(root: Path, nodes: list[dict[str, object]], summary: dict[str, object]) -> None:
    lines = [
        "# Random Dice 2 完整骰子樹（1.0.0 客戶端）",
        "",
        "> 這份圖表由 IPA 內的 `DiceTreeNodeTable`、骰子／被動／符文／支援資料表重建。它是完整靜態拓撲，不代表你截圖當下的已解鎖狀態。",
        "",
        f"- 節點：{summary['node_count']}（骰子 {summary['nodes_by_type'].get('DICE', 0)}、符文 {summary['nodes_by_type'].get('DICE_RUNE', 0)}、玩家被動 {summary['nodes_by_type'].get('PLAYER_PASSIVE', 0)}、支援 {summary['nodes_by_type'].get('PERK', 0)}）",
        f"- 連線：{summary['edge_count']}",
        "- 中央五個數字（全解鎖節點數）：" + "、".join(
            f"{BRANCH_ZH.get(branch, f'分支 {branch}')} {summary.get('full_unlock_nodes_by_branch', {}).get(str(branch), 0)}"
            for branch in sorted({int(node['branch']) for node in nodes})
        ),
        f"- 只計每個節點第一階段／解鎖費用：金幣 {summary['total_unlock_gold']:,}、核心 {summary['total_unlock_core']:,}",
        f"- 按資料表所有升級階段加總：金幣 {summary['total_max_gold']:,}、核心 {summary['total_max_core']:,}",
        f"- 圖示：已配對 {summary.get('icon_matches', 0)}／{summary['node_count']} 個節點（Sprite 資源）；其餘 {summary.get('icon_fallbacks', 0)} 個使用語意化 SVG 備援圖示",
        f"- 符文：RuneTable 共 {summary.get('rune_catalog_count', 0)} 筆；主樹 {summary.get('rune_catalog_tree_count', 0)} 筆，主樹外補充 {summary.get('rune_catalog_supplemental_count', 0)} 筆",
        "",
        "## 檔案",
        "",
        "- `dice_tree_full.svg`：先前樣式的精簡可縮放完整樹狀圖；滑鼠移到節點可看完整描述。",
        "- `sprite_icons/`／`sprites_manifest.json`：樹圖使用的透明圖示與來源索引。",
        "- `dice_tree_nodes.csv`：每個節點一列，含座標、前置／後續節點、成本、名稱與描述。",
        "- `dice_tree_edges.csv`：只保留連線關係，適合匯入圖表工具。",
        "- `dice_tree.json`：完整機器可讀資料。",
        "- `dice_runes_full.svg`：RuneTable 全部符文的卡片索引；主樹外資料標成「補充」，不虛構連線。",
        "- `rune_catalog.csv`／`dice_runes_full_zh-Hant.md`：153 筆符文的名稱、描述、Use、最大階段與圖示來源。",
        "",
        "## 分支節點數",
        "",
        "| 分支 | 節點數 |",
        "|---|---:|",
    ]
    for branch in sorted({int(node["branch"]) for node in nodes}):
        lines.append(f"| {BRANCH_ZH.get(branch, f'分支 {branch}')} | {summary['nodes_by_branch'].get(str(branch), 0)} |")
    lines += ["", "## 讀圖規則", "", "- 矩形＝骰子；菱形＝骰子符文；圓形＝玩家被動；六角形＝支援。", "- 線段方向為資料表 `NextNodes`，代表目前節點通往的後續節點。", "- `is_show`、`is_base` 是客戶端內容旗標，不要直接當成帳號已解鎖／未解鎖判定。", "- 截圖右側的「查看貨幣／詳細能力／隊伍」是 UI 功能，不是樹節點；它們不會出現在拓撲資料中。", ""]
    for branch in sorted({int(node["branch"]) for node in nodes}):
        branch_nodes = [node for node in nodes if int(node["branch"]) == branch]
        lines += [f"## {BRANCH_ZH.get(branch, f'分支 {branch}')}", "", "| ID | 類型 | 名稱 | 首階段費用 | 最大階段 | 解鎖條件 |", "|---:|---|---|---|---:|---|"]
        for node in sorted(branch_nodes, key=lambda value: int(value["index"])):
            lines.append(f"| {node['id']} | {node['node_type_zh']} | {str(node['name_zh']).replace('|', '\\|')} | {fmt_cost(node)} | {node['max_rank']} | {node['unlock_condition_zh']} {node['unlock_condition_value']} |")
        lines.append("")
    (root / "dice_tree_full_zh-Hant.md").write_text("\n".join(lines), encoding="utf-8")


def md_cell(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\r", " ").replace("\n", " ")


def write_rune_catalog(root: Path, rows: list[dict[str, object]]) -> None:
    """Write a complete, topology-neutral rune index for guide authoring."""
    fields = [
        "id", "kind", "rune_dice", "name_zh", "description_zh", "grade", "use",
        "max_rank", "in_tree", "icon_name", "icon_file", "icon_status",
    ]
    with (root / "rune_catalog.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    tree_count = sum(bool(row["in_tree"]) for row in rows)
    use_count = sum(str(row["use"]).lower() == "true" for row in rows)
    icon_counts = Counter(str(row["icon_status"]) for row in rows)
    lines = [
        "# Random Dice 2 完整符文索引（RuneTable）",
        "",
        "> 這份索引保留客戶端 `RuneTable.csv` 的全部資料。`主樹` 只表示該列的 ID 出現在 `DiceTreeNodeTable`；`主樹外` 是資料表存在但本版樹圖沒有連線的補充資料。",
        "",
        f"- 總數：{len(rows)} 筆；`Use=True`：{use_count} 筆。",
        f"- Dice Tree 已掛入：{tree_count} 筆；主樹外：{len(rows) - tree_count} 筆。",
        f"- 圖示全部有來源：符文 Sprite {icon_counts.get('rune-sprite', 0)} 筆；同家族 2 級／獨立家族圖示備援 {icon_counts.get('dice-fallback', 0)} 筆；未配對 {icon_counts.get('unmatched', 0)} 筆。",
        "- `icon_status=rune-sprite` 是符文 Sprite；`dice-fallback` 是沒有獨立 Runenode 時採用的同家族 2 級骰子或 `*_Icon` 家族圖示；`unmatched` 才代表客戶端未找到可配對圖示。",
        "",
        "| ID | 符文家族 | 名稱 | 說明 | Use | Tree | MaxRank | 圖示 |",
        "|---:|---|---|---|:---:|:---:|---:|---|",
    ]
    for row in rows:
        tree_mark = "主樹" if row["in_tree"] else "補充"
        use_mark = "是" if str(row["use"]).lower() == "true" else "否"
        icon = str(row["icon_name"]) or "—"
        lines.append(
            f"| {row['id']} | {md_cell(row['rune_dice'])} | {md_cell(row['name_zh'])} | "
            f"{md_cell(row['description_zh'])} | {use_mark} | {tree_mark} | {row['max_rank']} | {md_cell(icon)} ({row['icon_status']}) |"
        )
    (root / "dice_runes_full_zh-Hant.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def svg_image(
    icon_href: str,
    x: float,
    y: float,
    width: float,
    height: float,
    css_class: str = "node-icon",
    preserve_aspect_ratio: str = "xMidYMid meet",
) -> str:
    """Render a sprite reference; symbols keep the SVG file size manageable."""
    if not icon_href:
        return ""
    safe_href = html.escape(icon_href, quote=True)
    if icon_href.startswith("#"):
        return (
            f'<use class="{html.escape(css_class, quote=True)}" href="{safe_href}" xlink:href="{safe_href}" '
            f'x="{x:g}" y="{y:g}" width="{width:g}" height="{height:g}" '
            f'preserveAspectRatio="{html.escape(preserve_aspect_ratio, quote=True)}"/>'
        )
    return (
        f'<image class="{html.escape(css_class, quote=True)}" href="{safe_href}" x="{x:g}" y="{y:g}" width="{width:g}" '
        f'height="{height:g}" preserveAspectRatio="{html.escape(preserve_aspect_ratio, quote=True)}"/>'
    )


def svg_fallback_icon(node: dict[str, object]) -> str:
    """Draw a small semantic glyph when the client did not expose a dice Sprite."""
    dice_type = str(node.get("dice_type", ""))
    if dice_type == "Fear":
        return '<g class="fallback-icon"><circle r="18" fill="#311b45" stroke="#f1a6ff" stroke-width="2"/><path d="M-9,-2 L-1,-2 L4,-11 L2,-2 L10,-2 L-2,11 L1,2 L-8,2 Z" fill="#ffd6ff"/></g>'
    if dice_type == "Decay":
        return '<g class="fallback-icon"><path d="M0,-18 C10,-7 15,1 15,8 A15,15 0 1 1 -15,8 C-15,1 -10,-7 0,-18 Z" fill="#2c2448" stroke="#bca7ff" stroke-width="2"/><path d="M-6,5 C-1,1 4,3 8,-3" fill="none" stroke="#e5ddff" stroke-width="2" stroke-linecap="round"/></g>'
    label = html.escape(short_label(str(node.get("name_zh", "?")), 1))
    return f'<g class="fallback-icon"><circle r="18" fill="#25223d" stroke="#b9b2ce" stroke-width="2"/><text class="fallback-glyph" y="7">{label}</text></g>'


GAME_BG = "#2f2942"
GAME_FRAME = "#5f557d"
GAME_FRAME_INNER = "#332c4b"
GAME_EDGE = "#51496f"
GAME_EDGE_ACTIVE = "#ad9cdb"


def svg_coin_icon(cx: float, cy: float, size: float) -> str:
    radius = size * 0.42
    return (
        f'<g class="currency coin"><circle cx="{cx:g}" cy="{cy:g}" r="{radius:g}" fill="#ffb91f" stroke="#ffd969" stroke-width="2"/>'
        f'<circle cx="{cx:g}" cy="{cy:g}" r="{radius * .66:g}" fill="#f29d17" stroke="#d97b12" stroke-width="1.2"/>'
        f'<path d="M {cx - radius * .25:g} {cy - radius * .4:g} L {cx + radius * .25:g} {cy - radius * .4:g} L {cx + radius * .1:g} {cy + radius * .35:g} L {cx - radius * .25:g} {cy + radius * .35:g} Z" fill="#ffd55c" opacity=".78"/>'
        "</g>"
    )


def svg_gem_icon(cx: float, cy: float, size: float) -> str:
    half = size * 0.48
    return (
        f'<g class="currency gem"><polygon points="{cx:g},{cy - half:g} {cx + half * .8:g},{cy - half * .35:g} {cx + half * .55:g},{cy + half:g} {cx - half * .55:g},{cy + half:g} {cx - half * .8:g},{cy - half * .35:g}" fill="#d89bff" stroke="#f0d4ff" stroke-width="1.5"/>'
        f'<polygon points="{cx:g},{cy - half:g} {cx + half * .18:g},{cy + half:g} {cx - half * .18:g},{cy + half:g}" fill="#9e70ed" opacity=".75"/>'
        f'<polygon points="{cx - half * .8:g},{cy - half * .35:g} {cx:g},{cy - half:g} {cx - half * .18:g},{cy + half:g}" fill="#f1c8ff" opacity=".72"/>'
        "</g>"
    )


def svg_cost_badge(
    node: dict[str, object],
    badge_y: float,
    points_down: bool = True,
    currency_refs: dict[str, str] | None = None,
) -> str:
    gold = int(node.get("unlock_gold", 0) or 0)
    core = int(node.get("unlock_core", 0) or 0)
    items: list[tuple[str, int]] = []
    if gold:
        items.append(("gold", gold))
    if core:
        items.append(("core", core))
    if not items:
        return ""
    # Reserve a fixed text cell after each currency icon.  The previous
    # character-count estimate was narrower than the actual CJK/UI font, so
    # long values such as 100,000 could run back into the gem or coin.
    icon_size = 18
    icon_gap = 7
    text_gap = 7
    item_specs = []
    for kind, value in items:
        label = f"{value:,}"
        # Keep the allocation close to the rendered width of the UI font.  It
        # is deliberately an allocation only; the text itself remains natural
        # width so digits never get stretched to fill a badge.
        text_width = max(24, len(label) * 9.6)
        item_specs.append((kind, value, label, text_width))
    item_widths = [icon_size + icon_gap + text_width + text_gap for _, _, _, text_width in item_specs]
    badge_w = sum(item_widths) + max(0, len(items) - 1) * 7 + 18
    badge_h = 28
    left = -badge_w / 2
    top = badge_y
    pointer = (
        f'<path d="M -7 {top + badge_h + 1:g} L 0 {top + badge_h + 8:g} L 7 {top + badge_h + 1:g} Z" fill="#030207" opacity=".72"/>'
        f'<path d="M -7 {top + badge_h:g} L 0 {top + badge_h + 7:g} L 7 {top + badge_h:g} Z" fill="#050509"/>'
        if points_down
        else f'<path d="M -7 {top - 1:g} L 0 {top - 8:g} L 7 {top - 1:g} Z" fill="#030207" opacity=".72"/><path d="M -7 {top:g} L 0 {top - 7:g} L 7 {top:g} Z" fill="#050509"/>'
    )
    currency_refs = currency_refs or {}
    parts = [
        f'<g class="cost-badge"><rect x="{left:g}" y="{top:g}" width="{badge_w:g}" height="{badge_h:g}" rx="10" fill="#050509" stroke="#171122" stroke-width="1.5"/>'
        f'<rect x="{left + 1.5:g}" y="{top + 1.5:g}" width="{max(0, badge_w - 3):g}" height="{max(0, badge_h - 3):g}" rx="8.5" fill="none" stroke="#2b203b" stroke-opacity=".62" stroke-width="1"/>{pointer}'
    ]
    cursor = left + 14
    center_y = top + badge_h / 2
    for index, (kind, value, label, text_width) in enumerate(item_specs):
        href = currency_refs.get(kind, "")
        if href:
            parts.append(svg_image(href, cursor, center_y - icon_size / 2, icon_size, icon_size))
        elif kind == "gold":
            parts.append(svg_coin_icon(cursor + icon_size / 2, center_y, icon_size))
        else:
            parts.append(svg_gem_icon(cursor + icon_size / 2, center_y, icon_size))
        cursor += icon_size + icon_gap
        parts.append(
            f'<text class="cost-value" x="{cursor:g}" y="{top + 19.5:g}" '
            f'text-anchor="start">{label}</text>'
        )
        cursor += text_width + text_gap
        if index < len(items) - 1:
            cursor += 8
    parts.append("</g>")
    return "".join(parts)


def svg_rank_badge(node: dict[str, object], rank_y: float) -> str:
    max_rank = int(node.get("max_rank", 1) or 1)
    if max_rank <= 1:
        return ""
    label = f"1/{max_rank}"
    width = 24 + len(label) * 9
    left = -width / 2
    return (
        f'<g class="rank-badge"><rect x="{left:g}" y="{rank_y:g}" width="{width:g}" height="22" rx="5.5" fill="#050509" stroke="#171122" stroke-width="1.5"/>'
        f'<text class="rank-value" x="0" y="{rank_y + 15.5:g}">{html.escape(label)}</text></g>'
    )


GUIDE_LABEL_DIRECTIONS = (
    (-1, -1),
    (1, -1),
    (-1, 1),
    (1, 1),
    (-1, 0),
    (1, 0),
    (0, -1),
    (0, 1),
)
GUIDE_LABEL_GAP = 22.0
GUIDE_LABEL_PADDING_X = 16.0
GUIDE_LABEL_NAME_BASELINE = 22.0
GUIDE_LABEL_NAME_LINE_HEIGHT = 18.0
GUIDE_LABEL_EFFECT_LINE_HEIGHT = 15.0


def guide_node_half_size(node: dict[str, object], ui_scale: float) -> tuple[float, float]:
    node_type = str(node.get("node_type", ""))
    if node_type == "DICE":
        return 67 * ui_scale, 70 * ui_scale
    if node_type == "PERK":
        return 68 * ui_scale, 38 * ui_scale
    if node_type == "DICE_RUNE":
        return 50 * ui_scale, 51 * ui_scale
    if node_type == "PLAYER_PASSIVE":
        diameter = 122 if node.get("is_big") else 92
        half = diameter / 2 * ui_scale
        return half, half
    return 48 * ui_scale, 48 * ui_scale


def guide_annotation_layout(
    selected: list[dict[str, object]],
    sx,
    sy,
    node_scale: float,
    crop: bool = False,
) -> dict[str, dict[str, float | int | list[str]]]:
    """Choose a nearby open slot for each guide label instead of stacking labels upward."""
    node_boxes: dict[str, tuple[float, float, float, float]] = {}
    label_specs: dict[str, tuple[float, float, list[str], list[str]]] = {}
    for node in selected:
        node_id = str(node["id"])
        ui_scale = CLIENT_RUNE_SCALE if str(node.get("node_type")) == "DICE_RUNE" else node_scale
        x, y = sx(float(node["x"])), sy(float(node["y"]))
        half_w, half_h = guide_node_half_size(node, ui_scale)
        node_boxes[node_id] = (x - half_w, y - half_h, x + half_w, y + half_h)
        title = guide_display_name(node)
        name_lines = wrap_guide_text(title, 14, 1)
        # Dice cards already communicate their identity visually; the guide
        # annotation keeps only the localized die name.  Supports and rune /
        # passive nodes retain their concrete effect text.
        node_type = str(node.get("node_type"))
        effect_lines = [] if node_type == "DICE" else wrap_guide_text(guide_effect_text(node), 18 if node_type == "PERK" else 17, 2)
        # Dice labels contain only a short name, while effect labels get a
        # wider measure so Chinese sentences do not become cramped fragments.
        if node_type == "DICE":
            # Dice annotations contain only the short die name.  Size their
            # panel to that name instead of reusing the wider effect-label
            # width used by supports and rune/passive nodes.
            name_measure = max((len(line) for line in name_lines), default=1) * 16.0
            label_w = max(96.0, min(184.0, name_measure + GUIDE_LABEL_PADDING_X * 2 + 8.0))
        else:
            label_w = 252.0 if node_type == "PERK" else 242.0
        label_h = 16.0 + GUIDE_LABEL_NAME_LINE_HEIGHT * len(name_lines) + GUIDE_LABEL_EFFECT_LINE_HEIGHT * len(effect_lines) + 12.0
        label_specs[node_id] = (label_w, label_h, name_lines, effect_lines)

    occupied: list[tuple[float, float, float, float]] = []
    if not crop:
        cx, cy = sx(0), sy(0)
        unit = abs(float(sx(1)) - float(sx(0))) or 1.0
        occupied.append((cx - 300 * unit, cy - 230 * unit, cx + 300 * unit, cy + 230 * unit))

    def overlap_area(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:
        return max(0.0, min(a[2], b[2]) - max(a[0], b[0])) * max(0.0, min(a[3], b[3]) - max(a[1], b[1]))

    layout: dict[str, dict[str, float | int | list[str]]] = {}
    priority = sorted(
        selected,
        key=lambda item: (
            0 if str(item.get("node_type")) in {"DICE", "PERK"} else 1,
            -float(item.get("y", 0)),
            float(item.get("x", 0)),
        ),
    )
    for node in priority:
        node_id = str(node["id"])
        x, y = sx(float(node["x"])), sy(float(node["y"]))
        half_w, half_h = guide_node_half_size(node, CLIENT_RUNE_SCALE if str(node.get("node_type")) == "DICE_RUNE" else node_scale)
        label_w, label_h, name_lines, effect_lines = label_specs[node_id]
        best: tuple[float, tuple[float, float, float, float], int] | None = None
        for direction_index, (dx, dy) in enumerate(GUIDE_LABEL_DIRECTIONS):
            center_x = x + dx * (half_w + label_w / 2 + GUIDE_LABEL_GAP)
            center_y = y + dy * (half_h + label_h / 2 + GUIDE_LABEL_GAP)
            box = (center_x - label_w / 2, center_y - label_h / 2, center_x + label_w / 2, center_y + label_h / 2)
            overflow = max(0.0, -box[0]) + max(0.0, -box[1]) + max(0.0, box[2] - 8000) + max(0.0, box[3] - 7000)
            node_overlap = sum(overlap_area(box, other) for other in node_boxes.values() if other != node_boxes[node_id])
            label_overlap = sum(overlap_area(box, other) for other in occupied)
            distance = abs(dx) + abs(dy)
            score = overflow * 1000 + node_overlap * 12 + label_overlap * 20 + distance
            candidate = (score, box, direction_index)
            if best is None or candidate[0] < best[0]:
                best = candidate
        assert best is not None
        _, box, direction_index = best
        occupied.append(box)
        layout[node_id] = {
            "x": box[0],
            "y": box[1],
            "width": label_w,
            "height": label_h,
            "direction": direction_index,
            "name_lines": name_lines,
            "effect_lines": effect_lines,
            "node_x": x,
            "node_y": y,
        }
    return layout


def svg_guide_annotations(
    selected: list[dict[str, object]],
    sx,
    sy,
    node_scale: float,
    crop: bool = False,
) -> list[str]:
    layout = guide_annotation_layout(selected, sx, sy, node_scale, crop)
    parts: list[str] = []
    for node in selected:
        node_id = str(node["id"])
        item = layout[node_id]
        x = float(item["x"])
        y = float(item["y"])
        width = float(item["width"])
        height = float(item["height"])
        node_x = float(item["node_x"])
        node_y = float(item["node_y"])
        direction = GUIDE_LABEL_DIRECTIONS[int(item["direction"])]
        anchor_x = x + width / 2 - direction[0] * width / 2
        anchor_y = y + height / 2 - direction[1] * height / 2
        color = BRANCH_COLOR.get(int(node.get("branch", 0)), "#8b86a8")
        title_parts = [node_id, guide_node_kind(node), guide_display_name(node)]
        if str(node.get("node_type")) != "DICE":
            title_parts.append(guide_effect_text(node))
        title = html.escape("｜".join(title_parts))
        parts.append(
            f'<path class="guide-connector-underlay" d="M {node_x:.2f} {node_y:.2f} L {anchor_x:.2f} {anchor_y:.2f}"/>'
            f'<path class="guide-connector" stroke="{color}" d="M {node_x:.2f} {node_y:.2f} L {anchor_x:.2f} {anchor_y:.2f}"/>'
            f'<g class="guide-label" data-node-id="{html.escape(node_id)}"><title>{title}</title>'
            f'<rect x="{x:.2f}" y="{y:.2f}" width="{width:.2f}" height="{height:.2f}" rx="12" fill="#18152b" fill-opacity=".98" stroke="{color}" stroke-opacity=".82" stroke-width="2"/>'
            f'<rect x="{x + 2:.2f}" y="{y + 2:.2f}" width="{max(0, width - 4):.2f}" height="{max(0, height - 4):.2f}" rx="10" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="1"/>'
        )
        name_lines = item["name_lines"]
        effect_lines = item["effect_lines"]
        assert isinstance(name_lines, list) and isinstance(effect_lines, list)
        name_y = y + GUIDE_LABEL_NAME_BASELINE
        for line_index, line in enumerate(name_lines):
            parts.append(f'<text class="guide-name" x="{x + GUIDE_LABEL_PADDING_X:.2f}" y="{name_y + line_index * GUIDE_LABEL_NAME_LINE_HEIGHT:.2f}" text-anchor="start">{html.escape(str(line))}</text>')
        effect_y = name_y + GUIDE_LABEL_NAME_LINE_HEIGHT * len(name_lines)
        for line_index, line in enumerate(effect_lines):
            parts.append(f'<text class="guide-effect" x="{x + GUIDE_LABEL_PADDING_X:.2f}" y="{effect_y + line_index * GUIDE_LABEL_EFFECT_LINE_HEIGHT:.2f}" text-anchor="start">{html.escape(str(line))}</text>')
        parts.append("</g>")
    return parts


def svg_node(
    node: dict[str, object],
    sx,
    sy,
    icon_href: str = "",
    ui_scale: float = 1.0,
    currency_refs: dict[str, str] | None = None,
    big_passive_bg_href: str = "",
    small_passive_bg_href: str = "",
    dice_shadow_href: str = "",
    show_cost_badge: bool = True,
    show_rank_badge: bool = True,
) -> str:
    x, y = sx(float(node["x"])), sy(float(node["y"]))
    node_type = str(node["node_type"])
    body_filter = ' filter="url(#node-shadow)"'
    parts = [f'<g class="node bright" data-node-id="{html.escape(str(node["id"]))}" transform="translate({x:.2f},{y:.2f})"><g transform="scale({ui_scale:g})"><g class="node-body"{body_filter}>']
    if node_type == "DICE":
        # Bright and dim cards share this rounded-square geometry.  The
        # extracted *_On sprite is a selection/glow outline and has a
        # different crop, so it must not replace the client card shell.
        parts.append(
            '<rect x="-67" y="-70" width="134" height="140" rx="16" fill="#453e60" stroke="#8e81be" stroke-width="3"/>'
            '<rect x="-60" y="-63" width="120" height="126" rx="12" fill="#423a5b" stroke="#635788" stroke-width="1.5"/>'
        )
        dice_width = 118 * DICE_ICON_SCALE
        dice_height = 147 * DICE_ICON_SCALE
        if dice_shadow_href:
            # NodeSocketShadow is the client's diagonal lower-left mask (the
            # third shadow variant), not the small rounded DiceShadow crop.
            # Match the die width with a slightly larger mask.  Pull the
            # source's L-shaped inner corner back toward the die so the debug
            # silhouette remains easy to compare against the card.
            shadow_width = dice_width * DICE_SHADOW_SCALE
            shadow_height = shadow_width * 252 / 262
            shadow_x = -dice_width / 2 - shadow_width * DICE_SHADOW_INNER_X + DICE_SHADOW_INSET_X
            shadow_y = 70 - shadow_height * DICE_SHADOW_INNER_Y - DICE_SHADOW_INSET_Y
            parts.append(
                svg_image(
                    dice_shadow_href,
                    shadow_x,
                    shadow_y,
                    shadow_width,
                    shadow_height,
                    "dice-shadow",
                )
            )
        if icon_href:
            # Preserve the extracted die aspect ratio, enlarge it slightly,
            # and anchor its lower edge to the card so the top just overlaps
            # the outer frame as it does in the client.
            parts.append(
                svg_image(
                    icon_href,
                    -dice_width / 2,
                    70 - dice_height,
                    dice_width,
                    dice_height,
                )
            )
    elif node_type == "PERK":
        # Support portraits sit on a shallow, flat base.  The portrait is
        # bottom-anchored and intentionally rises above the base instead of
        # being squeezed into a tall dice-card shell.
        parts.append(
            '<rect x="-68" y="-38" width="136" height="76" rx="14" fill="#453e60" stroke="#8e81be" stroke-width="3"/>'
            '<rect x="-61" y="-31" width="122" height="62" rx="10" fill="#423a5b" stroke="#635788" stroke-width="1.5"/>'
        )
        if icon_href:
            parts.append(svg_image(icon_href, -62, -92, 124, 130))
    elif node_type == "DICE_RUNE":
        # Rune sprites already contain the game's circular bright base.  Do
        # not add the old diamond shell underneath them.
        if icon_href:
            parts.append(svg_image(icon_href, -46, -51, 92, 102))
        else:
            parts.append('<circle r="48" fill="#453e60" stroke="#8e81be" stroke-width="3"/><circle r="40" fill="#423a5b" stroke="#635788" stroke-width="1.5"/>')
    elif node_type == "PLAYER_PASSIVE":
        if node.get("is_big"):
            # Large account-wide stat nodes use the bright client frame plus
            # a cyan-to-pink gradient well.  The dark-purple glyph sprite is
            # then placed above the well, which preserves the extracted art
            # while restoring the game's colour treatment.
            if big_passive_bg_href:
                parts.append(svg_image(big_passive_bg_href, -61, -61, 122, 122))
            else:
                parts.append('<polygon points="0,-61 61,0 0,61 -61,0" fill="#453e60" stroke="#8e81be" stroke-width="3"/>')
            parts.append('<circle r="34" fill="url(#passive-big-gradient)" stroke="#5e547d" stroke-width="2"/>')
            if icon_href:
                glyph_w, glyph_h = 54 * PASSIVE_GLYPH_SCALE, 59 * PASSIVE_GLYPH_SCALE
                parts.append(
                    svg_image(
                        icon_href,
                        -glyph_w / 2,
                        -1.5 - glyph_h / 2,
                        glyph_w,
                        glyph_h,
                        "node-icon-flat",
                    )
                )
        else:
            diameter = 92
            if small_passive_bg_href:
                parts.append(svg_image(small_passive_bg_href, -diameter / 2, -diameter / 2, diameter, diameter))
            else:
                parts.append(f'<circle r="{diameter / 2:g}" fill="#453e60" stroke="#8e81be" stroke-width="3"/>')
            parts.append('<circle r="32" fill="url(#passive-big-gradient)" stroke="#5e547d" stroke-width="2"/>')
            if icon_href:
                glyph_w, glyph_h = 50 * PASSIVE_GLYPH_SCALE, 55 * PASSIVE_GLYPH_SCALE
                parts.append(
                    svg_image(
                        icon_href,
                        -glyph_w / 2,
                        -0.5 - glyph_h / 2,
                        glyph_w,
                        glyph_h,
                        "node-icon-flat",
                    )
                )
    else:
        parts.append('<rect x="-48" y="-48" width="96" height="96" rx="9" fill="#453e60" stroke="#8e81be" stroke-width="3"/>')
        if icon_href:
            parts.append(svg_image(icon_href, -42, -42, 84, 84))
    parts.append("</g>")
    screen_y = sy(float(node["y"]))
    badge_above = screen_y > 155
    if node_type == "PERK":
        badge_y = -125 if badge_above else 48
        rank_y = 76 if badge_above else -56
    elif node_type == "DICE":
        badge_y = -108 if badge_above else 80
        rank_y = 76 if badge_above else -80
    elif node_type == "PLAYER_PASSIVE":
        if node.get("is_big"):
            badge_y = -99 if badge_above else 71
            rank_y = 68 if badge_above else -71
        else:
            badge_y = -84 if badge_above else 56
            rank_y = 54 if badge_above else -56
    elif node_type == "DICE_RUNE":
        badge_y = -84 if badge_above else 56
        rank_y = 54 if badge_above else -56
    else:
        badge_y = -99 if badge_above else 71
        rank_y = 68 if badge_above else -71
    if show_cost_badge:
        parts.append(svg_cost_badge(node, badge_y, points_down=badge_above, currency_refs=currency_refs))
    if show_rank_badge:
        parts.append(svg_rank_badge(node, rank_y))
    parts.append("</g></g>")
    return "".join(parts)


def svg_branch_panels(selected: list[dict[str, object]], sx, sy, crop: bool) -> list[str]:
    """Add low-contrast branch lanes so the topology remains readable at a glance."""
    panels: list[str] = []
    padding = 240 if not crop else 160
    for branch in sorted({int(node["branch"]) for node in selected}):
        branch_nodes = [node for node in selected if int(node["branch"]) == branch]
        if not branch_nodes:
            continue
        min_x = min(float(node["x"]) for node in branch_nodes) - padding
        max_x = max(float(node["x"]) for node in branch_nodes) + padding
        min_y = min(float(node["y"]) for node in branch_nodes) - padding
        max_y = max(float(node["y"]) for node in branch_nodes) + padding
        left, right = sx(min_x), sx(max_x)
        top, bottom = sy(max_y), sy(min_y)
        x, y = min(left, right), min(top, bottom)
        width, height = abs(right - left), abs(bottom - top)
        color = BRANCH_COLOR.get(branch, "#78909c")
        label = html.escape(f"{BRANCH_ZH.get(branch, f'分支 {branch}')}  ·  {len(branch_nodes)} 節點")
        panels.append(
            f'<g class="branch-panel"><rect x="{x:.2f}" y="{y:.2f}" width="{width:.2f}" height="{height:.2f}" '
            f'rx="28" fill="{color}" fill-opacity=".055" stroke="{color}" stroke-opacity=".18" stroke-width="1.5"/>'
            f'<rect x="{x + 20:.2f}" y="{y + 16:.2f}" width="{max(110, 18 + len(label) * 7):.2f}" height="26" rx="13" '
            f'fill="#11152a" fill-opacity=".84" stroke="{color}" stroke-opacity=".38"/>'
            f'<circle cx="{x + 35:.2f}" cy="{y + 29:.2f}" r="4" fill="{color}"/>'
            f'<text class="panel-label" x="{x + 47:.2f}" y="{y + 34:.2f}">{label}</text></g>'
        )
    return panels


def render_svg_legacy_fancy(root: Path, nodes: list[dict[str, object]], edges: list[dict[str, object]], filename: str, crop: bool = False) -> None:
    """Retained only as a historical comparison; the compact renderer below is active."""
    selected = nodes
    selected_ids = {str(node["id"]) for node in selected}
    edge_rows = [edge for edge in edges if str(edge["from"]) in selected_ids and str(edge["to"]) in selected_ids]
    if crop and selected:
        min_x = min(float(node["x"]) for node in selected) - 450
        max_x = max(float(node["x"]) for node in selected) + 450
        min_y = min(float(node["y"]) for node in selected) - 450
        max_y = max(float(node["y"]) for node in selected) + 450
        canvas_w, canvas_h = 2000, 1500
        top, bottom, left, right = 150, 86, 80, 80
    else:
        min_x, max_x, min_y, max_y = -4900, 4900, -4000, 4000
        canvas_w, canvas_h = 3400, 2850
        top, bottom, left, right = 180, 100, 120, 120
    scale = min((canvas_w - left - right) / (max_x - min_x), (canvas_h - top - bottom) / (max_y - min_y))
    used_w, used_h = (max_x - min_x) * scale, (max_y - min_y) * scale
    x_offset = left + ((canvas_w - left - right) - used_w) / 2
    y_offset = top + ((canvas_h - top - bottom) - used_h) / 2
    sx = lambda value: x_offset + (value - min_x) * scale
    sy = lambda value: y_offset + (max_y - value) * scale
    by_id = {str(node["id"]): node for node in selected}
    branch_ids = sorted({int(node["branch"]) for node in selected})
    branch_title = BRANCH_ZH.get(branch_ids[0], f"分支 {branch_ids[0]}") if crop and len(branch_ids) == 1 else "完整骰子樹"
    title = html.escape(f"Random Dice 2 · {branch_title}")
    subtitle = html.escape(f"{len(selected)} 個節點  ·  {len(edge_rows)} 條連線  ·  iOS 1.0.0 客戶端快照")
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{canvas_w}" height="{canvas_h}" viewBox="0 0 {canvas_w} {canvas_h}" shape-rendering="geometricPrecision" role="img" aria-labelledby="svg-title svg-desc">',
        "<style>",
        "text{font-family:'Noto Sans TC','PingFang TC','Microsoft JhengHei UI','Microsoft JhengHei',sans-serif;fill:#f6f4ff;text-anchor:middle;font-variant-numeric:tabular-nums;text-rendering:geometricPrecision}.title{font-size:31px;font-weight:800;letter-spacing:-.02em}.eyebrow{font-size:11px;font-weight:700;letter-spacing:.18em;fill:#a8a4c8}.subtitle{font-size:14px;fill:#b6b2cc}.panel-label{font-size:12px;font-weight:700;text-anchor:start}.edge{fill:none;stroke-linecap:round;stroke-width:2.8;opacity:.54}.edge-underlay{fill:none;stroke:#090b18;stroke-linecap:round;stroke-width:7;opacity:.36}.node .cost{font-size:10.5px;font-weight:750;fill:#ffe5a2;letter-spacing:.01em}.node .id{font-size:8.5px;fill:#aaa7c2;letter-spacing:.04em}.dice-label{font-size:12px;font-weight:750;letter-spacing:.02em}.mini-label{font-size:8px;font-weight:750;fill:#f0edff}.fallback-glyph{font-size:17px;font-weight:800;fill:#f5edff}.node-icon{filter:drop-shadow(0 2px 3px #080a17)}.node-icon-flat{pointer-events:none;filter:brightness(.72) saturate(1.4) hue-rotate(10deg)}.node-icon-deep{filter:brightness(.72) saturate(1.4) hue-rotate(10deg) drop-shadow(0 1.5px 1.6px #0b0813)}.dice-shadow{pointer-events:none;opacity:.34;filter:brightness(0) saturate(100%)}.icon-well{stroke:#ffffff;stroke-opacity:.08}.status-dot{filter:drop-shadow(0 0 5px currentColor)}.header-rule{stroke:#ffffff;stroke-opacity:.08}.footer-note{font-size:11px;fill:#8985a8}.legend-label{font-size:11px;fill:#c7c3dc}.legend-shape{stroke:#d9d4ef;stroke-width:1.3}.show{stroke-width:3.2}",
        "</style>",
        '<title id="svg-title">' + title + '</title>',
        '<desc id="svg-desc">' + subtitle + '；節點滑鼠懸停可查看完整描述。</desc>',
        '<defs>',
        '<linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1024"/><stop offset=".55" stop-color="#171533"/><stop offset="1" stop-color="#251644"/></linearGradient>',
        '<radialGradient id="glow-a" cx="18%" cy="16%" r="70%"><stop offset="0" stop-color="#6352a5" stop-opacity=".28"/><stop offset="1" stop-color="#251644" stop-opacity="0"/></radialGradient>',
        '<radialGradient id="glow-b" cx="82%" cy="76%" r="64%"><stop offset="0" stop-color="#c459a5" stop-opacity=".18"/><stop offset="1" stop-color="#251644" stop-opacity="0"/></radialGradient>',
        '<pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse"><path d="M96 0H0V96" fill="none" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/></pattern>',
        '<filter id="node-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#050610" flood-opacity=".55"/></filter>',
        '<filter id="node-icon-deep" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".48 0 0 0 .01 0 .50 .05 0 .01 0 .06 .88 0 .03 0 0 0 1 0"/><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#0b0813" flood-opacity=".72"/></filter>',
        '<marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#c9c3e2" fill-opacity=".72"/></marker>',
    ]
    for branch, color in BRANCH_COLOR.items():
        parts.append(
            f'<linearGradient id="branch-rune-{branch}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{color}" stop-opacity=".32"/><stop offset="1" stop-color="#11152a" stop-opacity=".92"/></linearGradient>'
        )
    icon_refs: dict[str, str] = {}
    sprite_files = sprite_file_lookup(root)

    def add_sprite_by_name(name: str) -> str:
        return register_asset_symbol(root, parts, icon_refs, sprite_files.get(name.casefold(), ""))

    for node in selected:
        icon_file = str(node.get("icon_file", ""))
        if icon_file:
            register_asset_symbol(root, parts, icon_refs, icon_file)
    currency_refs = {} if annotated else {
        "gold": add_sprite_by_name("item_gold"),
        "core": add_sprite_by_name("item_node_goods"),
    }
    dice_shadow_href = add_sprite_by_name("NodeSocketShadow")
    parts.append('</defs>')
    parts.extend([
        '<rect width="100%" height="100%" fill="url(#background)"/>',
        '<rect width="100%" height="100%" fill="url(#glow-a)"/>',
        '<rect width="100%" height="100%" fill="url(#glow-b)"/>',
        '<rect x="0" y="0" width="100%" height="100%" fill="url(#grid)"/>',
        f'<g class="header"><text class="eyebrow" x="{canvas_w / 2:.1f}" y="35">RANDOM DICE 2  ·  RESEARCH MAP</text><text class="title" x="{canvas_w / 2:.1f}" y="76">{title}</text><text class="subtitle" x="{canvas_w / 2:.1f}" y="104">{subtitle}</text><path class="header-rule" d="M {canvas_w * .25:.1f} 126 H {canvas_w * .75:.1f}"/></g>',
    ])
    if not crop:
        legend_items = [("骰子", "rect", BRANCH_COLOR[1]), ("符文", "diamond", BRANCH_COLOR[2]), ("被動", "circle", BRANCH_COLOR[4]), ("支援", "hex", BRANCH_COLOR[5])]
        start_x = canvas_w / 2 - 260
        legend_parts = ['<g class="legend">']
        for index, (label, shape, color) in enumerate(legend_items):
            lx = start_x + index * 170
            if shape == "rect":
                legend_parts.append(f'<rect class="legend-shape" x="{lx - 48:.1f}" y="139" width="16" height="12" rx="4" fill="{color}" fill-opacity=".28"/>')
            elif shape == "diamond":
                legend_parts.append(f'<polygon class="legend-shape" points="{lx - 40},145 {lx - 32},137 {lx - 24},145 {lx - 32},153" fill="{color}" fill-opacity=".28"/>')
            elif shape == "circle":
                legend_parts.append(f'<circle class="legend-shape" cx="{lx - 32}" cy="145" r="7" fill="{color}" fill-opacity=".28"/>')
            else:
                legend_parts.append(f'<polygon class="legend-shape" points="{lx - 40},140 {lx - 32},136 {lx - 24},140 {lx - 24},150 {lx - 32},154 {lx - 40},150" fill="{color}" fill-opacity=".28"/>')
            legend_parts.append(f'<text class="legend-label" x="{lx - 6}" y="149">{label}</text>')
        legend_parts.append('</g>')
        parts.extend(legend_parts)
    parts.extend(svg_branch_panels(selected, sx, sy, crop))
    for edge in edge_rows:
        parent, child = by_id[str(edge["from"])], by_id[str(edge["to"])]
        edge_color = BRANCH_COLOR.get(int(parent["branch"]), "#8b86a8")
        x1, y1 = sx(float(parent["x"])), sy(float(parent["y"]))
        x2, y2 = sx(float(child["x"])), sy(float(child["y"]))
        parts.append(f'<path class="edge-underlay" d="M {x1:.2f} {y1:.2f} L {x2:.2f} {y2:.2f}"/>')
        parts.append(f'<path class="edge" stroke="{edge_color}" marker-end="url(#arrow)" d="M {x1:.2f} {y1:.2f} L {x2:.2f} {y2:.2f}"/>')
    for node in selected:
        # Node geometry is already expressed in SVG pixels after sx/sy maps
        # the topology.  This legacy renderer is retained only for comparison;
        # its historical scale is intentionally unchanged.
        node_scale = 0.42 if not crop else 1.0
        parts.append(
            svg_node(
                node,
                sx,
                sy,
                icon_refs.get(str(node.get("icon_file", "")), ""),
                node_scale,
                currency_refs,
                dice_shadow_href=dice_shadow_href,
            )
        )
    fallback_count = sum(1 for node in selected if not icon_refs.get(str(node.get("icon_file", ""))))
    note = (
        "符文圖示已按家族校正；所有節點均使用已提取 Sprite。"
        if fallback_count == 0
        else f"符文圖示已按家族校正；{fallback_count} 個節點使用語意化 SVG 備援。"
    )
    parts.append(f'<text class="footer-note" x="{canvas_w / 2:.1f}" y="{canvas_h - 28}">{html.escape(note)}</text>')
    parts.append("</svg>")
    (root / filename).write_text("\n".join(parts), encoding="utf-8")


def svg_game_chrome(canvas_w: int, canvas_h: int, ui_refs: dict[str, str] | None = None) -> list[str]:
    """Recreate the visible currency/header and tree action controls from the client UI."""
    scale = canvas_w / 1640
    ui_refs = ui_refs or {}
    parts: list[str] = ['<g class="game-ui" aria-label="遊戲介面">']

    def asset(name: str, x: float, y: float, width: float, height: float) -> None:
        href = ui_refs.get(name, "")
        if href:
            parts.append(svg_image(href, x * scale, y * scale, width * scale, height * scale))

    def pill(x: float, y: float, width: float, label: str) -> None:
        parts.append(f'<rect class="ui-pill" x="{x * scale:g}" y="{y * scale:g}" width="{width * scale:g}" height="72" rx="22"/>')
        parts.append(f'<text class="ui-value" x="{(x + width * .56) * scale:g}" y="{(y + 47) * scale:g}">{html.escape(label)}</text>')

    # Top inventory strip: the screenshot uses four nearly-black rounded pills.
    pill(360, 28, 238, "+ 16")
    asset("item_coop_Ticket_1", 373, 30, 62, 68)
    pill(620, 28, 206, "2")
    asset("item_arena_Ticket_1", 633, 30, 62, 68)
    pill(850, 28, 282, "7")
    asset("item_node_goods", 869, 29, 62, 68)
    pill(1150, 28, 410, "3,464")
    asset("item_gold", 1172, 28, 64, 68)

    # Right-side actions shown in the full tree screen.
    button_x = 1445
    for y, kind, text in ((1350, "check", "查看貨幣"), (1550, "bars", "詳細能力"), (1750, "cube", "隊伍")):
        parts.append(f'<g class="ui-action" transform="translate({button_x * scale:g},{y * scale:g})">')
        parts.append('<rect x="-92" y="-58" width="184" height="116" rx="18" fill="#211b31" fill-opacity=".88" stroke="#2a223b" stroke-width="3"/>')
        if kind == "check":
            parts.append('<rect x="-42" y="-40" width="84" height="70" rx="13" fill="#161321" stroke="#392d55" stroke-width="3"/><path d="M-23 -4 L-4 16 L30 -24" fill="none" stroke="#42e59c" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>')
        elif kind == "bars":
            parts.append('<rect x="-44" y="-33" width="24" height="58" rx="5" fill="#a34ce4"/><rect x="-10" y="-15" width="24" height="40" rx="5" fill="#7d55e7"/><rect x="24" y="-48" width="24" height="73" rx="5" fill="#4e8cf0"/>')
        else:
            asset("icon_menu_dice", -47, -48, 94, 94)
            if not ui_refs.get("icon_menu_dice", ""):
                parts.append('<path d="M0 -42 L42 -25 L42 27 L0 45 L-42 27 L-42 -25 Z" fill="#36a3ea" stroke="#76d5ff" stroke-width="4"/><path d="M0 -42 L0 45 M-42 -25 L0 -8 L42 -25" fill="none" stroke="#d5f4ff" stroke-width="4"/><path d="M-17 0 h34 v23 h-34 z" fill="#2172c9"/>')
        parts.append(f'<text class="ui-action-label" x="0" y="88">{html.escape(text)}</text></g>')

    # Bottom controls: close and reset tree.
    parts.append('<g class="ui-close" transform="translate(105 2140)"><rect x="-74" y="-64" width="148" height="128" rx="26" fill="#171323" stroke="#783ad2" stroke-width="6"/>')
    asset("icon_close", -25, -25, 50, 50)
    if not ui_refs.get("icon_close", ""):
        asset("close-50", -25, -25, 50, 50)
    if not ui_refs.get("icon_close", "") and not ui_refs.get("close-50", ""):
        parts.append('<path d="M-28 -24 L28 32 M28 -24 L-28 32" stroke="#d4a2ff" stroke-width="13" stroke-linecap="round"/>')
    parts.append('</g>')
    parts.append('<g class="ui-reset" transform="translate(1300 2140)"><rect x="-280" y="-62" width="540" height="124" rx="16" fill="#762a45" stroke="#be3d5f" stroke-width="5"/>')
    asset("item_ticket_4", -250, -43, 86, 86)
    if not ui_refs.get("item_ticket_4", ""):
        parts.append('<path d="M-226 -13 C-252 -46 -301 -10 -278 18 C-265 35 -236 35 -220 14 C-205 35 -176 35 -163 18 C-140 -10 -189 -46 -215 -13 C-220 -22 -222 -22 -226 -13 Z" fill="#ffd064" stroke="#ffefaa" stroke-width="3"/>')
    parts.append('<text class="ui-reset-count" x="-196" y="40">x1</text><text class="ui-reset-label" x="35" y="13">重置骰子樹</text></g>')
    parts.append("</g>")
    return parts


def svg_tree_center(
    by_id: dict[str, dict[str, object]],
    sx,
    sy,
    center_stats: dict[int, tuple[str, str, str]],
    center_base_href: str = "",
    center_tree_href: str = "",
    center_dim_refs: dict[int, str] | None = None,
    center_unit: float | None = None,
) -> list[str]:
    """Render the client-authentic central Dice Tree UI.

    The centre card is UI chrome rather than a row in ``DiceTreeNodeTable``.
    Its composition is taken from the extracted sprites used by the client:
    ``DiceTreeBase`` (stretched by its RectTransform), ``icon_menu_tree`` for
    the three core dice, and the five ``icon_group_*`` branch marks.  The five
    representative dice at the ends of the links remain ordinary data nodes.
    """
    center_dim_refs = center_dim_refs or {}
    unit = center_unit or abs(float(sx(1)) - float(sx(0))) or 1.0
    cx, cy = float(sx(0)), float(sy(0))
    # The screenshot's central panel is 480x285 in the extracted tree
    # coordinate system (the source DiceTreeBase sprite is 234x160 and is
    # stretched by the game's UI layout).
    panel_w, panel_h = 480 * unit, 285 * unit
    half_w, half_h = panel_w / 2, panel_h / 2
    # The extracted frame has a few transparent rows at its lower rounded
    # corners. A one-pixel screen-space nudge keeps the visible border on the
    # same y coordinates as PopupDiceTree while the stretched height restores
    # the reference panel's 192x108 visual footprint.
    panel_top = cy - half_h + 1.0
    panel_cy = panel_top + half_h
    parts: list[str] = ['<g class="tree-center" aria-label="骰子樹中央分支概覽">']

    # The client draws all five missing centre links with the same light
    # lavender line as the tree.  Their near endpoints are fixed slots on the
    # central panel (rather than the mathematical intersection of a line and
    # the panel rectangle); only the far endpoint follows the data-tree root.
    # Draw them before the card and node sprites so each endpoint disappears
    # naturally beneath its frame.
    link_starts = {
        1: (cx, panel_top + 1.0),
        2: (cx - 43.0, panel_top + panel_h - 4.0),
        3: (cx + 43.0, panel_top + panel_h - 4.0),
        4: (cx - half_w, cy - 13.0),
        5: (cx + half_w, cy - 13.0),
    }
    for branch, root_id in TREE_CENTER_ROOTS.items():
        root = by_id.get(root_id)
        if not root:
            continue
        tx, ty = float(sx(float(root["x"]))), float(sy(float(root["y"])))
        start_x, start_y = link_starts[branch]
        if start_x == tx and start_y == ty:
            continue
        parts.append(
            f'<path class="tree-center-link" d="M {start_x:.2f} {start_y:.2f} L {tx:.2f} {ty:.2f}"/>'
        )

    # These are the actual open spaces reserved by PopupDiceTree around the
    # centre panel.  Keeping them in tree units makes the same layout hold for
    # the full map and for a different SVG viewport scale.
    label_positions = {
        1: (0, 320),
        2: (-215, -350),
        3: (245, -350),
        4: (-420, 80),
        5: (420, 80),
    }
    # PopupDiceTree gives each branch its own two-line label block; the name
    # and value are not on a single shared baseline.  These offsets are the
    # screen-space slots read from the extracted client layout, expressed in
    # the same tree units as ``label_positions``.
    name_offsets = {1: -65, 2: -38, 3: -15, 4: -50, 5: -50}
    value_offsets = {1: 35, 2: 60, 3: 85, 4: 50, 5: 50}
    mark_offsets = {1: -25, 2: -12, 3: 12, 4: -12, 5: -12}
    for branch, root_id in TREE_CENTER_ROOTS.items():
        root = by_id.get(root_id)
        if not root:
            continue
        del root  # The label positions are fixed UI slots, not topology data.
        offset_x, offset_y = label_positions[branch]
        lx = cx + offset_x * unit
        ly = cy - offset_y * unit
        mark_ly = ly + mark_offsets[branch] * unit
        name, value, color = center_stats[branch]
        dim_href = center_dim_refs.get(branch, "")
        # The group sprites are white masks in the asset bundle.  The per-branch
        # filter turns that mask into the same low-contrast colour used by the
        # live UI without inventing a new vector emblem.
        dim_size = 190 * unit
        if dim_href:
            parts.append(
                svg_image(
                    dim_href,
                    lx - dim_size / 2,
                    mark_ly - dim_size * 0.50,
                    dim_size,
                    dim_size,
                    f"tree-center-stat-mark tree-center-stat-mark-{branch}",
                )
            )
        parts.append(
            f'<text class="tree-center-stat-name" x="{lx:.2f}" y="{ly + name_offsets[branch] * unit:.2f}" style="fill:{color}">{html.escape(name)}</text>'
            f'<text class="tree-center-stat-value" x="{lx:.2f}" y="{ly + value_offsets[branch] * unit:.2f}" style="fill:{color}">{html.escape(value)}</text>'
        )

    # The card is an extracted client sprite.  The vector fallback is only for
    # an older extraction that predates DiceTreeBase.
    if center_base_href:
        parts.append(
            svg_image(
                center_base_href,
                cx - half_w,
                panel_top,
                panel_w,
                panel_h,
                "tree-center-base",
                "none",
            )
        )
    else:
        parts.append(
            f'<rect x="{cx - half_w:.2f}" y="{cy - half_h:.2f}" width="{half_w * 2:.2f}" height="{half_h * 2:.2f}" rx="{18 * unit:.2f}" fill="#453e60" stroke="#8e81be" stroke-width="{3 * unit:.2f}"/>'
        )

    # This single sprite is the exact three-dice composition seen inside the
    # centre panel; composing item_node_goods variants produced the wrong
    # colours, order and connecting stem.
    if center_tree_href:
        tree_w, tree_h = 194 * unit, 197 * unit
        parts.append(
            svg_image(
                center_tree_href,
                cx - tree_w / 2,
                cy - 160 * unit,
                tree_w,
                tree_h,
                "tree-center-tree-icon",
            )
        )
    parts.append(f'<text class="tree-center-title" x="{cx:.2f}" y="{cy + 84 * unit:.2f}">骰子樹</text>')
    parts.append("</g>")
    return parts


def render_svg(
    root: Path,
    nodes: list[dict[str, object]],
    edges: list[dict[str, object]],
    filename: str,
    crop: bool = False,
    annotated: bool = False,
) -> None:
    """Render the compact tree style, optionally with guide-facing labels."""
    selected = nodes
    selected_ids = {str(node["id"]) for node in selected}
    edge_rows = [edge for edge in edges if str(edge["from"]) in selected_ids and str(edge["to"]) in selected_ids]
    if crop and selected:
        min_x = min(float(node["x"]) for node in selected) - 450
        max_x = max(float(node["x"]) for node in selected) + 450
        min_y = min(float(node["y"]) for node in selected) - 450
        max_y = max(float(node["y"]) for node in selected) + 450
        canvas_w, canvas_h = 2000, 1500
        top, bottom, left, right = 130, 80, 80, 80
    elif annotated:
        # The annotated map deliberately uses a near 1:1 topology scale so
        # each name/effect card has room beside the 200-unit rune spacing.
        min_x, max_x, min_y, max_y = -4500, 4500, -4000, 4000
        canvas_w, canvas_h = 8000, 7000
        top, bottom, left, right = 220, 220, 220, 220
    else:
        # The full output is the tree itself.  The surrounding inventory,
        # menu and reset controls are intentionally omitted; those belong to
        # the game screen, not to the topology guide.
        min_x, max_x, min_y, max_y = -4500, 4500, -4000, 4000
        # A large guide canvas keeps the 200-unit node spacing legible when
        # the complete five-branch tree is viewed at once.
        canvas_w, canvas_h = 4000, 3400
        top, bottom, left, right = 100, 100, 100, 100
    scale = min((canvas_w - left - right) / (max_x - min_x), (canvas_h - top - bottom) / (max_y - min_y))
    # The annotated map may spread node positions across a larger canvas, but
    # every pre-existing game element keeps the exact unit scale of the normal
    # 4000×3400 full map.  Only line lengths and label positions are allowed
    # to change in that variant.
    reference_unit = min((4000 - 100 - 100) / 9000, (3400 - 100 - 100) / 8000)
    used_w, used_h = (max_x - min_x) * scale, (max_y - min_y) * scale
    x_offset = left + ((canvas_w - left - right) - used_w) / 2
    y_offset = top + ((canvas_h - top - bottom) - used_h) / 2
    sx = lambda value: x_offset + (value - min_x) * scale
    sy = lambda value: y_offset + (max_y - value) * scale
    by_id = {str(node["id"]): node for node in selected}
    # The client uses the same node RectTransform scale in the complete tree
    # and in a branch view.  Keeping one scale preserves the measured ratio of
    # a node card to the central DiceTreeBase instead of shrinking only the
    # complete-tree nodes.
    node_scale = CLIENT_NODE_SCALE
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{canvas_w}" height="{canvas_h}" viewBox="0 0 {canvas_w} {canvas_h}" shape-rendering="geometricPrecision">',
        "<style>",
        "text{font-family:'Noto Sans TC','Microsoft JhengHei UI','Microsoft JhengHei','Segoe UI',sans-serif;fill:#f7f3ff;text-anchor:middle;font-variant-numeric:tabular-nums;font-synthesis:none;text-rendering:geometricPrecision;-webkit-font-smoothing:antialiased}.edge{fill:none;stroke:#a89ad3;stroke-linecap:round;stroke-width:3.2;opacity:.9}.node-body{stroke-linejoin:round}.node-icon{pointer-events:none;filter:drop-shadow(0 1.5px 1.6px #0b0813)}.node-icon-flat{pointer-events:none;filter:brightness(.72) saturate(1.4) hue-rotate(10deg)}.node-icon-deep{pointer-events:none;filter:brightness(.72) saturate(1.4) hue-rotate(10deg) drop-shadow(0 1.5px 1.6px #0b0813)}.dice-shadow{pointer-events:none;opacity:.34;filter:brightness(0) saturate(100%)}.cost-badge,.rank-badge{pointer-events:none;filter:url(#badge-shadow)}.cost-value{font-size:15px;font-weight:700;fill:#ffffff;text-anchor:start;letter-spacing:.01em}.rank-value{font-size:14px;font-weight:700;fill:#ffffff}.guide-connector-underlay{fill:none;stroke:#0a0715;stroke-linecap:round;stroke-width:5.4;stroke-opacity:.66}.guide-connector{fill:none;stroke-linecap:round;stroke-width:2.2;stroke-opacity:.72}.guide-label{pointer-events:none;filter:url(#guide-label-shadow)}.guide-name{font-size:15.5px;font-weight:850;fill:#ffffff;text-anchor:start;letter-spacing:.01em}.guide-effect{font-size:12.5px;font-weight:750;fill:#f2efff;text-anchor:start;letter-spacing:.005em}.tree-center{pointer-events:none}.tree-center-link{fill:none;stroke:#a89ad3;stroke-linecap:round;stroke-width:3.2;opacity:.96}.tree-center-base{pointer-events:none}.tree-center-tree-icon{pointer-events:none;filter:drop-shadow(0 1.5px 1.8px #0b0813)}.tree-center-stat-mark{pointer-events:none;opacity:.22}.tree-center-stat-mark-1{filter:url(#tree-center-stat-color-1)}.tree-center-stat-mark-2{filter:url(#tree-center-stat-color-2)}.tree-center-stat-mark-3{filter:url(#tree-center-stat-color-3)}.tree-center-stat-mark-4{filter:url(#tree-center-stat-color-4)}.tree-center-stat-mark-5{filter:url(#tree-center-stat-color-5)}.tree-center-title{font-size:19px;font-weight:700;fill:#66b8f9;paint-order:stroke;stroke:#29233f;stroke-width:1.2;stroke-linejoin:round}.tree-center-stat-name{font-size:16px;font-weight:700;paint-order:stroke;stroke:#302944;stroke-width:1.2;stroke-linejoin:round}.tree-center-stat-value{font-size:44px;font-weight:800;paint-order:stroke;stroke:#302944;stroke-width:2.6;stroke-linejoin:round}.show{stroke-width:3}",
        "</style>",
        "<defs>",
        '<filter id="node-shadow" x="-35%" y="-35%" width="170%" height="190%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#0a0712" flood-opacity=".48"/></filter>',
        '<filter id="badge-shadow" x="-30%" y="-40%" width="160%" height="190%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#05030a" flood-opacity=".52"/></filter>',
        '<filter id="guide-label-shadow" x="-30%" y="-40%" width="160%" height="190%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="3" stdDeviation="2.8" flood-color="#080513" flood-opacity=".7"/></filter>',
        '<filter id="node-icon-deep" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".48 0 0 0 .01 0 .50 .05 0 .01 0 .06 .88 0 .03 0 0 0 1 0"/><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#0b0813" flood-opacity=".72"/></filter>',
        '<linearGradient id="passive-big-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#82f4ff"/><stop offset=".4" stop-color="#c5f4ff"/><stop offset=".72" stop-color="#f5c8ff"/><stop offset="1" stop-color="#ff9fd4"/></linearGradient>',
    ]
    center_stats = center_stats_for_nodes(selected)
    for branch, (_, _, color) in center_stats.items():
        parts.append(
            f'<filter id="tree-center-stat-color-{branch}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">'
            f'<feFlood flood-color="{color}" result="stat-color"/><feComposite in="stat-color" in2="SourceAlpha" operator="in"/></filter>'
        )
    icon_refs: dict[str, str] = {}
    sprite_files = sprite_file_lookup(root)

    def add_sprite_by_name(name: str) -> str:
        return register_asset_symbol(root, parts, icon_refs, sprite_files.get(name.casefold(), ""))

    for node in selected:
        icon_file = str(node.get("icon_file", ""))
        if icon_file:
            register_asset_symbol(root, parts, icon_refs, icon_file)
    currency_refs = {
        "gold": add_sprite_by_name("item_gold"),
        "core": add_sprite_by_name("item_node_goods"),
    }
    big_passive_bg_href = add_sprite_by_name("PassiveBig_BG_0")
    small_passive_bg_href = add_sprite_by_name("Passivenode_BG_2")
    dice_shadow_href = add_sprite_by_name("NodeSocketShadow")
    center_base_href = (
        register_asset_symbol_stretched(
            root,
            parts,
            icon_refs,
            sprite_files.get("dicetreebase", ""),
        )
        if not crop
        else ""
    )
    center_tree_href = add_sprite_by_name("icon_menu_tree") if not crop else ""
    center_dim_refs = (
        {
            branch: add_sprite_by_name(name)
            for branch, name in TREE_CENTER_DIMS.items()
        }
        if not crop
        else {}
    )
    parts.extend(['</defs>', f'<rect width="100%" height="100%" fill="{GAME_BG}"/>'])
    for edge in edge_rows:
        parent, child = by_id[str(edge["from"])], by_id[str(edge["to"])]
        x1, y1 = sx(float(parent["x"])), sy(float(parent["y"]))
        x2, y2 = sx(float(child["x"])), sy(float(child["y"]))
        parts.append(f'<path class="edge" d="M {x1:.2f} {y1:.2f} L {x2:.2f} {y2:.2f}"/>')
    if not crop:
        parts.extend(
            svg_tree_center(
                by_id,
                sx,
                sy,
                center_stats,
                center_base_href,
                center_tree_href,
                center_dim_refs,
                reference_unit if annotated else None,
            )
        )
    for node in selected:
        # Node geometry is already expressed in SVG pixels after sx/sy map
        # the topology.  Only the rune child uses the compact scale; every
        # other node keeps the client-sized treatment.
        node_ui_scale = (
            CLIENT_RUNE_SCALE if str(node.get("node_type")) == "DICE_RUNE" else node_scale
        )
        parts.append(
            svg_node(
                node,
                sx,
                sy,
                icon_refs.get(str(node.get("icon_file", "")), ""),
                node_ui_scale,
                currency_refs,
                big_passive_bg_href,
                small_passive_bg_href,
                dice_shadow_href,
                show_cost_badge=not annotated,
                show_rank_badge=not annotated,
            )
        )
    if annotated:
        parts.extend(svg_guide_annotations(selected, sx, sy, node_scale, crop=False))
    parts.append("</svg>")
    (root / filename).write_text("\n".join(parts), encoding="utf-8")


def render_rune_catalog_svg(root: Path, rows: list[dict[str, object]], filename: str = "dice_runes_full.svg") -> None:
    """Render all RuneTable families in a compact, non-topological card index."""
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in rows:
        grouped[str(row["rune_dice"])].append(row)
    families = list(grouped)
    columns = 3
    card_w, card_h = 740, 194
    gap_x, gap_y = 24, 20
    margin_x, margin_y = 50, 50
    rows_count = math.ceil(len(families) / columns)
    canvas_w = margin_x * 2 + columns * card_w + (columns - 1) * gap_x
    canvas_h = margin_y * 2 + rows_count * card_h + (rows_count - 1) * gap_y
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{canvas_w}" height="{canvas_h}" viewBox="0 0 {canvas_w} {canvas_h}" role="img" aria-labelledby="rune-title rune-desc">',
        "<style>",
        "text{font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;fill:#f7f3ff}.family-title{font-size:18px;font-weight:700}.family-meta{font-size:11px;fill:#aaa4c1}.rune-name{font-size:13px}.rune-meta{font-size:10px;fill:#aaa4c1}.rune-missing{font-size:16px;fill:#aaa4c1;text-anchor:middle}.node-icon{pointer-events:none}",
        "</style>",
        '<title id="rune-title">Random Dice 2 完整符文索引</title>',
        f'<desc id="rune-desc">RuneTable {len(rows)} 筆；主樹 {sum(bool(row["in_tree"]) for row in rows)} 筆，主樹外補充 {sum(not bool(row["in_tree"]) for row in rows)} 筆。</desc>',
        '<defs>',
    ]
    icon_refs: dict[str, str] = {}
    for row in rows:
        icon_file = str(row.get("icon_file", ""))
        if not icon_file or icon_file in icon_refs:
            continue
        data_uri = icon_data_uri(root, row)
        if not data_uri:
            continue
        icon_id = f"rune-sprite-{len(icon_refs) + 1}"
        icon_refs[icon_file] = f"#{icon_id}"
        safe_uri = html.escape(data_uri, quote=True)
        parts.append(
            f'<symbol id="{icon_id}" viewBox="0 0 1 1"><image href="{safe_uri}" xlink:href="{safe_uri}" x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid meet"/></symbol>'
        )
    parts.extend(['</defs>', f'<rect width="100%" height="100%" fill="#29233f"/>'])
    for index, family in enumerate(families):
        col, row_index = index % columns, index // columns
        x = margin_x + col * (card_w + gap_x)
        y = margin_y + row_index * (card_h + gap_y)
        family_rows = grouped[family]
        active_count = sum(bool(item["in_tree"]) for item in family_rows)
        border = BRANCH_COLOR.get((index % 5) + 1, "#736b91") if active_count else "#514b68"
        fill = "#322b4b" if active_count else "#2d2943"
        status = "主樹" if active_count else "補充"
        parts.append(
            f'<g class="rune-family"><rect x="{x}" y="{y}" width="{card_w}" height="{card_h}" rx="8" fill="{fill}" stroke="{border}" stroke-width="2"/>'
            f'<text class="family-title" x="{x + 18}" y="{y + 28}">{html.escape(family)}</text>'
            f'<text class="family-meta" x="{x + card_w - 18}" y="{y + 26}" text-anchor="end">{status} · {active_count}/{len(family_rows)}</text>'
        )
        for item_index, item in enumerate(family_rows):
            iy = y + 48 + item_index * 45
            tooltip = html.escape(f"R{item['id']}｜{item['name_zh']}｜{item['description_zh']}")
            parts.append(f'<g class="rune-row"><title>{tooltip}</title>')
            href = icon_refs.get(str(item.get("icon_file", "")), "")
            if href:
                parts.append(svg_image(href, x + 14, iy - 14, 28, 28))
            else:
                parts.append(f'<circle cx="{x + 28}" cy="{iy}" r="12" fill="#4a455f" stroke="#77718d"/><text class="rune-missing" x="{x + 28}" y="{iy + 6}">?</text>')
            tree_mark = "主樹" if item["in_tree"] else "補充"
            use_mark = "Use" if str(item["use"]).lower() == "true" else "停用"
            name = short_label(str(item["name_zh"]), 18)
            meta = f"R{item['id']} · {tree_mark} · {use_mark} · Lv{item['max_rank']}"
            parts.append(f'<text class="rune-name" x="{x + 54}" y="{iy + 5}">{html.escape(name)}</text>')
            parts.append(f'<text class="rune-meta" x="{x + card_w - 18}" y="{iy + 4}" text-anchor="end">{html.escape(meta)}</text></g>')
        parts.append('</g>')
    parts.append('</svg>')
    (root / filename).write_text("\n".join(parts), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("research/random-dice-2-1.0.0"))
    args = parser.parse_args()
    root = args.root.resolve()
    nodes, payload = load_nodes(root)
    summary = payload["summary"]
    edges = payload["edges"]
    rune_catalog = load_rune_catalog(root, nodes)
    summary["rune_catalog_count"] = len(rune_catalog)
    summary["rune_catalog_tree_count"] = sum(bool(row["in_tree"]) for row in rune_catalog)
    summary["rune_catalog_supplemental_count"] = sum(not bool(row["in_tree"]) for row in rune_catalog)
    summary["rune_catalog_icon_status"] = dict(Counter(str(row["icon_status"]) for row in rune_catalog))
    write_nodes(root, nodes, edges, summary)
    write_markdown(root, nodes, summary)
    write_rune_catalog(root, rune_catalog)
    render_svg(root, nodes, edges, "dice_tree_full.svg")
    render_svg(root, nodes, edges, "dice_tree_annotated.svg", annotated=True)
    for branch in sorted({int(node["branch"]) for node in nodes}):
        branch_nodes = [node for node in nodes if int(node["branch"]) == branch]
        render_svg(root, branch_nodes, edges, f"dice_tree_branch_{branch}.svg", crop=True)
    render_rune_catalog_svg(root, rune_catalog)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
