import struct
import os

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    data = f.read()

# Let's search null-terminated strings around string offset
# In metadata, stringOffset is at offset 16 in header? Let's find string table by looking at ASCII blocks.
# Let's find large continuous blocks of null-terminated strings.
print("Scanning for string blocks...")
string_candidates = []
pos = 0
while pos < len(data):
    # check if next 100 bytes have null-separated ascii strings
    if data[pos:pos+1] >= b' ' and data[pos:pos+1] <= b'~':
        start = pos
        while pos < len(data) and (data[pos] == 0 or (data[pos] >= 0x20 and data[pos] <= 0x7E)):
            pos += 1
        length = pos - start
        if length > 50000: # large string table
            string_candidates.append((start, length))
    else:
        pos += 1

print("String candidates (offset, len):", string_candidates)

for start, length in string_candidates:
    sub = data[start:start+length]
    tokens = [t.decode('latin1') for t in sub.split(b'\x00') if len(t) > 0]
    print(f"Block at {start}: {len(tokens)} tokens. Sample: {tokens[:10]}")
    # filter tokens
    relevant = [t for t in tokens if any(k in t.lower() for k in ['light', 'resonance', 'attackspeed', 'calcattack', 'getattackspeed', 'buff', 'quantumuser'])]
    print(f"Relevant in block: {len(relevant)}")
    if len(relevant) > 10:
        with open("research/string_table_tokens.txt", "w", encoding="utf-8") as out:
            for t in tokens:
                out.write(t + "\n")
        print("Wrote string_table_tokens.txt")
