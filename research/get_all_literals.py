import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

# Let's inspect string literals around Resonance, BoardEffect, AttackInterval
# Let's find all string literals that mention Resonance, Light, Coop, Board, AttackSpeed
str_offset = 1257980
sl_entries_offset = 380
sl_entries_size = 181884
sldata_offset = 182264

literals = []
for i in range(0, sl_entries_size, 8):
    length, off = struct.unpack('<II', meta[sl_entries_offset+i : sl_entries_offset+i+8])
    if off < 1075715 and length < 500:
        s = meta[sldata_offset+off : sldata_offset+off+length].decode('utf-8', errors='ignore')
        literals.append(s)

print(f"Total literals parsed: {len(literals)}")
with open("research/all_literals.txt", "w", encoding="utf-8") as out:
    for s in literals:
        out.write(s + "\n")

# Filter
reso_lits = [s for s in literals if any(k in s.lower() for k in ['resonance', 'light', 'attackspeed', 'buff', 'interval', 'boardeffect', 'defender'])]
print(f"Relevant literals: {len(reso_lits)}")
for s in reso_lits[:30]:
    print("  ", repr(s))
