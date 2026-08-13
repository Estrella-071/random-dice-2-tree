import csv

for f in ['DiceTreeNodeTable.csv', 'PlayerPassiveTable.csv', 'PerkActionTable.csv']:
    path = 'research/random-dice-2-1.0.0/tables/' + f
    with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
        reader = csv.reader(fp)
        rows = list(reader)
        print(f'=== {f} ({len(rows)} rows) ===')
        header = rows[0]
        count = 0
        for r in rows[1:]:
            row_str = ' '.join(r)
            if any(k in row_str.lower() for k in ['light', 'resonance', 'attackspeed', 'attackinterval', 'speed', 'buff', 'atk']):
                d = {k: v for k, v in zip(header, r) if v}
                print(d)
                count += 1
                if count >= 30:
                    print("... truncated ...")
                    break
