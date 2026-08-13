import os
import csv

tables_dir = r"research/random-dice-2-1.0.0/tables"
for f in os.listdir(tables_dir):
    if f.endswith('.csv'):
        path = os.path.join(tables_dir, f)
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                reader = csv.reader(fp)
                rows = list(reader)
                if not rows:
                    continue
                header = rows[0]
                matched_rows = []
                for row in rows[1:]:
                    row_str = " ".join(row)
                    if any(k in row_str.lower() for k in ['light', 'resonance', 'lightboardeffect', 'attackspeed', '공속', '광', '공명', '光', '共鳴']):
                        matched_rows.append(row)
                if matched_rows:
                    print(f"=== {f} ===")
                    print("Header:", header)
                    for r in matched_rows:
                        print("Row:", r)
                    print()
        except Exception as e:
            print(f"Error {f}: {e}")
