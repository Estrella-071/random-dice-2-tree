import os
import csv

tables_dir = r"research/random-dice-2-1.0.0/tables"
for f in os.listdir(tables_dir):
    if f.endswith('.csv'):
        path = os.path.join(tables_dir, f)
        with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
            reader = csv.reader(fp)
            rows = list(reader)
            if not rows:
                continue
            header = rows[0]
            for i, r in enumerate(rows[1:], 1):
                row_str = " ".join(r)
                if any(k in row_str.lower() for k in ['light', 'resonance', 'attackspeed', 'attackinterval', '공속', '광', '공명', '光', '共鳴']):
                    print(f"[{f} Line {i}]")
                    for h, v in zip(header, r):
                        if v.strip():
                            print(f"  {h}: {v}")
                    print()
