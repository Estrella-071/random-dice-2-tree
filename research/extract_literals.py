import struct
import os

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta_bytes = f.read()

# Let's inspect string literals in metadata
# Many formula constants or method names or string keys are in string literals
def search_string_literals():
    header = struct.unpack('<64I', meta_bytes[:256])
    # in v39:
    # 2: stringLiteralsOffset, 3: stringLiteralsCount
    # 4: stringLiteralDataOffset, 5: stringLiteralDataCount
    # 6: stringOffset, 7: stringCount
    # Let's find all string literals
    sl_off = header[2]
    sl_cnt = header[3]
    sldata_off = header[4]
    
    print(f"Reading {sl_cnt // 8} string literals...")
    lits = []
    for i in range(0, sl_cnt, 8):
        length, offset = struct.unpack('<II', meta_bytes[sl_off+i:sl_off+i+8])
        s = meta_bytes[sldata_off+offset:sldata_off+offset+length].decode('utf-8', errors='ignore')
        lits.append(s)
    return lits

lits = search_string_literals()
print(f"Total string literals: {len(lits)}")

with open("research/string_literals.txt", "w", encoding="utf-8") as out:
    for s in lits:
        out.write(s + "\n")

# Print matching string literals
matching = [s for s in lits if any(k in s.lower() for k in ['light', 'resonance', 'attack', 'speed', 'interval', 'stack', 'ratio'])]
print(f"Matching string literals: {len(matching)}")
for s in matching[:50]:
    print("  ", s)
