import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

# Let's inspect string literals:
# We know string literals data is at offset 182264
# In v29+, string literal entry is (int32 length, int32 dataOffset)
# Let's write a parser for string literals
sl_entries_offset = 380
sl_entries_size = 181884 # 181884 / 8 = 22735 entries
sldata_offset = 182264

literals = []
for i in range(0, sl_entries_size, 8):
    length, off = struct.unpack('<ii', meta[sl_entries_offset+i : sl_entries_offset+i+8])
    if off >= 0 and length > 0:
        s = meta[sldata_offset+off : sldata_offset+off+length].decode('utf-8', errors='ignore')
        literals.append(s)

print(f"Parsed {len(literals)} string literals!")
for s in literals:
    if any(k in s.lower() for k in ['resonance', 'lightboard', 'attackspeed', 'attackinterval', 'lightdefender']):
        print("Literal:", s)
