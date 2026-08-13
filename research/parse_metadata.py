import struct
import re

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"

with open(metadata_path, 'rb') as f:
    data = f.read()

# Let's inspect string literals and string table
# In metadata v24-v31:
# Header:
# 0: sanity (4)
# 4: version (4)
# 8: stringLiteralOffset (4)
# 12: stringLiteralCount (4)
# 16: stringLiteralDataOffset (4)
# 20: stringLiteralDataCount (4)
# 24: stringOffset (4)
# 28: stringCount (4)

header_ints = struct.unpack('<64I', data[:256])
print("Header uint32s:", header_ints[:20])

stringLiteralOffset = header_ints[2]
stringLiteralCount = header_ints[3]
stringLiteralDataOffset = header_ints[4]
stringLiteralDataCount = header_ints[5]
stringOffset = header_ints[6]
stringCount = header_ints[7]

print(f"stringLiteralOffset: {stringLiteralOffset}, count: {stringLiteralCount}")
print(f"stringLiteralDataOffset: {stringLiteralDataOffset}, count: {stringLiteralDataCount}")
print(f"stringOffset: {stringOffset}, count: {stringCount}")

# Let's extract all strings in the string table
strings_raw = data[stringOffset : stringOffset + stringCount]
strings = strings_raw.split(b'\x00')
print(f"Total strings extracted: {len(strings)}")

interesting = []
for s in strings:
    try:
        dec = s.decode('utf-8')
        if any(k in dec.lower() for k in ['light', 'resonance', 'attackspeed', 'attackinterval', 'buff', 'stack', 'coop', 'boardeffect']):
            interesting.append(dec)
    except:
        pass

print(f"Found {len(interesting)} interesting strings in string table.")
with open("research/interesting_strings.txt", "w", encoding="utf-8") as out:
    for s in interesting:
        out.write(s + "\n")

# Also look for string literals
lit_strings = []
# stringLiteral is an array of (length, dataOffset)
for i in range(0, stringLiteralCount, 8): # usually 8 bytes: uint32 length, uint32 dataOffset
    # wait, struct is: uint32_t length; uint32_t dataIndex;
    pass

# Or simply regex scan ASCII/UTF-8 strings in the entire metadata
all_ascii = re.findall(rb'[\x20-\x7E]{4,}', data)
print(f"Total ASCII substrings: {len(all_ascii)}")
matching_ascii = [s.decode('ascii', errors='ignore') for s in all_ascii if any(k in s.lower() for k in [b'light', b'resonance', b'attackspeed', b'attack_speed'])]
print(f"Matching ASCII tokens: {len(matching_ascii)}")
with open("research/matching_ascii.txt", "w", encoding="utf-8") as out:
    for s in set(matching_ascii):
        out.write(s + "\n")
