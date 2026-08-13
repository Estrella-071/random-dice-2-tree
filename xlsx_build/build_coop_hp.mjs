import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const cwd = process.cwd();
const root = path.resolve(cwd, "research", "random-dice-2-1.0.0");
const outputDir = path.resolve(cwd, "outputs", "coop-hp-20260813");

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

function parseCsv(text) {
  const rows = [];
  let line = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        line += '""';
        i += 1;
      } else {
        quoted = !quoted;
        line += ch;
      }
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      if (line.length > 0) rows.push(parseCsvLine(line));
      line = "";
    } else {
      line += ch;
    }
  }
  if (line.length > 0) rows.push(parseCsvLine(line));
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, i) => [header, row[i] ?? ""])));
}

async function readCsv(file) {
  return parseCsv(await fs.readFile(path.join(root, file), "utf8"));
}

function typed(value) {
  if (value === "" || value === null || value === undefined) return null;
  if (/^-?\d+(\.\d+)?$/.test(String(value))) return Number(value);
  return value;
}

function rowsToMatrix(rows, columns) {
  return rows.map((row) => columns.map((column) => typed(row[column])));
}

// Keep the workbook intentionally plain: values and formulas only.
// These helpers retain the existing build structure while deliberately
// avoiding colors, fonts, borders, merged cells, column sizing, and tables.
function applyBase(sheet, title, subtitle) {
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A2").values = [[subtitle]];
}

function styleHeader() {}
function styleBody() {}
function setWidths() {}
function addTable() {}

const coop = await readCsv("tables/CoopWaveTable.csv");
const minions = await readCsv("tables/MinionTable.csv");
const hpCatalog = await readCsv("monster_hp_catalog.csv");
const bossCatalog = await readCsv("boss_catalog.csv");

const bossName = new Map(hpCatalog.filter((row) => row.mode === "共通怪物設定" && row.monster_type === "Boss").map((row) => [row.boss_type, row.boss_name_zh || row.boss_type]));
const bossMeta = new Map(hpCatalog.filter((row) => row.mode === "共通怪物設定" && row.monster_type === "Boss").map((row) => [row.boss_type, row]));
const minionMeta = new Map(minions.filter((row) => row.MinionType === "Boss").map((row) => [row.BossType, row]));
const bossDescription = new Map(bossCatalog.map((row) => [row.BossType, row.zh_tw_local_desc || ""]));
const bossWaves = coop.filter((row) => Number(row.BossBaseHP || 0) > 0);
const normalWaves = coop.filter((row) => Number(row.BossBaseHP || 0) === 0);

const workbook = Workbook.create();
const overview = workbook.worksheets.add("總覽");
const bossSheet = workbook.worksheets.add("Boss波");
const normalSheet = workbook.worksheets.add("普通波");
const bossMetaSheet = workbook.worksheets.add("Boss設定");
const rawSheet = workbook.worksheets.add("原始合作表");
const sourceSheet = workbook.worksheets.add("來源說明");

applyBase(overview, "Random Dice 2｜合作模式怪物血量", "資料版本：iOS 1.0.0 客戶端快照。Boss 波可直接查基礎值；普通波 HPIncrease 是原始調整值，不等於單隻怪物最終血量。", "H");
overview.getRange("A4:B9").values = [
  ["指標", "數值"],
  ["Boss 波數", null],
  ["普通波數", null],
  ["合作總波數", null],
  ["最高 Boss 基礎 HP", null],
  ["資料版本", "iOS 1.0.0"],
];
overview.getRange("B5:B8").formulas = [
  ["=COUNT('Boss波'!A5:A20)"],
  ["=COUNT('普通波'!A5:A68)"],
  ["=COUNT('原始合作表'!A5:A84)"],
  ["=MAX('Boss波'!B5:B20)"],
];
styleHeader(overview, "A4:B4");
overview.getRange("A11").values = [["怎麼讀"]];
overview.getRange("A12:A15").values = [
  ["1. 每 5 波是 Boss 波，先看「Boss波」工作表的 Boss 基礎 HP。"],
  ["2. 其他波次是普通波，查看 HPIncrease 與增加間隔；這兩欄是遊戲運算的輸入，不是最終血條。"],
  ["3. Boss設定 顯示 BossHpPer；小丑與極速狂影在客戶端資料中為 50，可能影響實際 HP。"],
  ["4. 原始合作表保留 CoopWaveTable 全欄位，方便回查。"],
];
overview.freezePanes.freezeRows(4);
setWidths(overview, { A: 24, B: 20, C: 4, D: 18, E: 18, F: 18, G: 18, H: 18 }, 15);

applyBase(bossSheet, "合作模式｜Boss 波血量", "BossBaseHP 是該波 Boss 的基礎值；Boss 順序中的秒數是 BossSpawnTime 欄位。", "I");
const bossColumns = ["Wave", "BossBaseHP", "Boss 1", "出現秒數 1", "Boss 2", "出現秒數 2", "Boss 3", "出現秒數 3", "備註"];
const bossRows = bossWaves.map((row) => {
  const values = [];
  for (let i = 1; i <= 3; i += 1) {
    const t = row[`BossType${i}`];
    values.push(t && t !== "None" ? bossName.get(t) || t : null, t && t !== "None" ? typed(row[`BossSpawnTime${i}`]) : null);
  }
  const types = [row.BossType1, row.BossType2, row.BossType3].filter((t) => t && t !== "None");
  return [typed(row.Id), typed(row.BossBaseHP), values[0], values[1], values[2], values[3], values[4], values[5], types.join(" → ")];
});
bossSheet.getRange(`A4:I${4 + bossRows.length}`).values = [bossColumns, ...bossRows];
styleHeader(bossSheet, "A4:I4");
styleBody(bossSheet, `A5:I${4 + bossRows.length}`);
addTable(bossSheet, `A4:I${4 + bossRows.length}`, "CoopBossWaves");
bossSheet.freezePanes.freezeRows(4);
setWidths(bossSheet, { A: 10, B: 18, C: 18, D: 14, E: 18, F: 14, G: 18, H: 14, I: 36 }, 4 + bossRows.length);

applyBase(normalSheet, "合作模式｜普通波 HPIncrease", "HPIncrease 是波次血量調整原始值；HPIncreaseInterval 是增加間隔（秒），兩者都不是單隻怪物最終 HP。", "I");
const normalColumns = ["Wave", "HPIncrease", "增加間隔（秒）", "普通怪數", "普通怪間隔（秒）", "速度怪數", "速度怪間隔（秒）", "大型怪數", "大型怪間隔（秒）"];
const normalRows = normalWaves.map((row) => [typed(row.Id), typed(row.HPIncrease), typed(row.HPIncreaseInterval), typed(row.NormalCount), typed(row.NormalInterval), typed(row.SpeedCount), typed(row.SpeedInterval), typed(row.BigCount), typed(row.BigInterval)]);
normalSheet.getRange(`A4:I${4 + normalRows.length}`).values = [normalColumns, ...normalRows];
styleHeader(normalSheet, "A4:I4");
styleBody(normalSheet, `A5:I${4 + normalRows.length}`);
addTable(normalSheet, `A4:I${4 + normalRows.length}`, "CoopNormalWaves");
normalSheet.freezePanes.freezeRows(4);
setWidths(normalSheet, { A: 10, B: 16, C: 18, D: 14, E: 20, F: 14, G: 20, H: 14, I: 20 }, 4 + normalRows.length);

applyBase(bossMetaSheet, "合作模式｜Boss 設定", "MinionTable 的 BossHpPer 是 Boss 個別倍率欄位；BossBaseHP 則來自 CoopWaveTable。", "G");
const metaColumns = ["BossType", "繁中名稱", "BossHpPer", "移速", "SP", "TrophyLevel", "技能描述"];
const metaRows = [...bossMeta.values()].map((row) => {
  const source = minionMeta.get(row.boss_type) || {};
  return [row.boss_type, row.boss_name_zh, typed(source.BossHpPer), typed(source.BaseMoveSpeed), typed(source.SPPer), typed(source.TrophyLevel), bossDescription.get(row.boss_type) || ""];
});
bossMetaSheet.getRange(`A4:G${4 + metaRows.length}`).values = [metaColumns, ...metaRows];
styleHeader(bossMetaSheet, "A4:G4");
styleBody(bossMetaSheet, `A5:G${4 + metaRows.length}`);
addTable(bossMetaSheet, `A4:G${4 + metaRows.length}`, "CoopBossSettings");
bossMetaSheet.freezePanes.freezeRows(4);
setWidths(bossMetaSheet, { A: 16, B: 18, C: 12, D: 12, E: 12, F: 14, G: 58 }, 4 + metaRows.length);

applyBase(rawSheet, "原始合作表｜CoopWaveTable", "保留 IPA 提取出的原始欄位，供查核與日後重新計算。", "U");
const rawColumns = Object.keys(coop[0]);
const rawRows = coop.map((row) => rawColumns.map((column) => typed(row[column])));
const rawEnd = String.fromCharCode(64 + rawColumns.length);
rawSheet.getRange(`A4:${rawEnd}${4 + rawRows.length}`).values = [rawColumns, ...rawRows];
styleHeader(rawSheet, `A4:${rawEnd}4`);
styleBody(rawSheet, `A5:${rawEnd}${4 + rawRows.length}`);
addTable(rawSheet, `A4:${rawEnd}${4 + rawRows.length}`, "RawCoopWaveTable");
rawSheet.freezePanes.freezeRows(4);
setWidths(rawSheet, { A: 8, B: 14, C: 20, D: 14, E: 12, F: 14, G: 16, H: 14, I: 12, J: 14, K: 12, L: 16, M: 16, N: 16, O: 16, P: 16, Q: 16, R: 26, S: 14, T: 20, U: 20 }, 4 + rawRows.length);

applyBase(sourceSheet, "來源與欄位說明", "這份工作簿是從隨附的 Random Dice 2 iOS 1.0.0 IPA 靜態資產整理而來。", "D");
sourceSheet.getRange("A4:D11").values = [
  ["項目", "位置／欄位", "用途", "備註"],
  ["IPA 原始檔", "Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/resources.assets", "Unity 資產容器", "來源快照，不是即時伺服器資料"],
  ["Unity TextAsset", "CoopWaveTable", "合作模式 1–80 波設定", "包含 BossBaseHP、HPIncrease 等欄位"],
  ["Boss 基礎血量", "CoopWaveTable.BossBaseHP", "Boss 波基礎 HP", "Wave 5–80 每 5 波一筆"],
  ["普通波調整", "CoopWaveTable.HPIncrease", "普通波血量增加原始值", "不是單隻怪物最終 HP"],
  ["增加間隔", "CoopWaveTable.HPIncreaseInterval", "HP 增加間隔（秒）", "不是血量"],
  ["Boss 類型", "BossType1–3 / BossSpawnTime1–3", "Boss 出場順序與時間", "名稱已用繁中本地化"],
  ["Boss 個別欄位", "MinionTable.BossHpPer", "Boss 個別倍率欄位", "可能影響實際血條，需配合執行時公式"],
];
styleHeader(sourceSheet, "A4:D4");
styleBody(sourceSheet, "A5:D11");
sourceSheet.getRange("A13:D15").values = [
  ["已提取檔案", "research/random-dice-2-1.0.0/tables/CoopWaveTable.csv", "原始合作波次 CSV", ""],
  ["簡明攻略", "research/random-dice-2-1.0.0/coop_hp_guide_zh-Hant.md", "合作模式血量速查", ""],
  ["完整混合資料", "research/random-dice-2-1.0.0/monster_hp_catalog.csv", "共通／競技場／合作模式資料", ""],
];
setWidths(sourceSheet, { A: 18, B: 62, C: 30, D: 34 }, 15);

await fs.mkdir(outputDir, { recursive: true });
for (const sheetName of ["總覽", "Boss波", "普通波", "Boss設定", "來源說明"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const rawPreview = await workbook.render({ sheetName: "原始合作表", range: "A1:U18", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "原始合作表.png"), new Uint8Array(await rawPreview.arrayBuffer()));

const inspect = await workbook.inspect({ kind: "table", range: "總覽!A1:H15", include: "values,formulas", tableMaxRows: 15, tableMaxCols: 8, maxChars: 8000 });
console.log("SUMMARY_INSPECT\n" + inspect.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log("FORMULA_ERRORS\n" + errors.ndjson);
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
const outputPath = path.join(outputDir, "Random_Dice_2_Coop_HP.xlsx");
await xlsx.save(outputPath);
const reloaded = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const recheck = await reloaded.inspect({ kind: "table", range: "Boss波!A4:I20", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 9, maxChars: 5000 });
console.log("RELOAD_CHECK\n" + recheck.ndjson);
const reloadedErrors = await reloaded.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "reloaded formula error scan" });
console.log("RELOADED_FORMULA_ERRORS\n" + reloadedErrors.ndjson);
console.log(JSON.stringify({ output: outputPath, bossWaves: bossWaves.length, normalWaves: normalWaves.length, totalWaves: coop.length }));
