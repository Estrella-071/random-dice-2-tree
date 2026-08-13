import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

# Let's locate the string table start
# Earlier we found string table block at offset 1257980 (0x1331FC), size 3506404
# Where in header is 1257980?
ints = struct.unpack('<64I', meta[:256])
for idx, val in enumerate(ints):
    if val == 1257980:
        print(f"String table offset is at header index {idx}: {val} (0x{val:X})")
        print(f"Following count is at header index {idx+1}: {ints[idx+1]}")

str_offset = 1257980
def get_str(idx):
    if idx < 0 or idx >= 3506404:
        return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# Now test every header offset pair (off, size) to see if it contains TypeDefinitions, Methods, Fields etc.
for h_idx in range(2, 60, 2):
    off = ints[h_idx]
    size = ints[h_idx+1]
    if off == 0 or size == 0 or off + size > len(meta):
        continue
    # Let's test if entries at `off` have first uint32 as a valid string index
    # Test record sizes from 12 to 120
    best = []
    for rsize in [12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100]:
        cnt = size // rsize
        if cnt < 10: continue
        valid = 0
        names = []
        for i in range(min(20, cnt)):
            idx0 = struct.unpack('<I', meta[off + i*rsize : off + i*rsize + 4])[0]
            s = get_str(idx0)
            if s and len(s) > 1 and (s[0].isalpha() or s[0] in '<_.'):
                valid += 1
                names.append(s)
        if valid >= 15:
            best.append((rsize, valid, names[:5]))
    if best:
        print(f"Header[{h_idx//2}] (off=0x{off:X}, size=0x{size:X}): matches {best}")

