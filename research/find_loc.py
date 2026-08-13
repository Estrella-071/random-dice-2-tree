import csv

with open('research/random-dice-2-1.0.0/text_assets/localization_text.txt', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if not row: continue
        key = row[0]
        row_str = ' '.join(row)
        if any(k in row_str.lower() for k in ['lightboard', 'diceskill_light', 'diceskill_reso', 'dice_light', 'dice_reso', 'lightbuff', 'resonancebase']):
            tw = row[4] if len(row) > 4 else ""
            en = row[2] if len(row) > 2 else ""
            print(f"{key} => [zh-tw]: {tw} | [en]: {en}")
