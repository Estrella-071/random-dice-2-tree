import struct
import re

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

# Let's search for fields of BoardEffect struct or component in global-metadata
# In Quantum, structs generated from .qtn files have fields defined in metadata
# Let's find all string occurrences related to BoardEffect struct fields
str_offset = 1257980
def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# Let's search all strings starting with "BoardEffect" or containing "BoardEffect"
tokens = []
pos = 0
while True:
    idx = meta.find(b"BoardEffect", str_offset + pos)
    if idx == -1 or idx >= str_offset + 3506404:
        break
    # find string boundary
    s_start = meta.rfind(b'\x00', str_offset, idx) + 1
    s_end = meta.find(b'\x00', idx)
    s = meta[s_start:s_end].decode('utf-8', errors='ignore')
    tokens.append(s)
    pos = idx - str_offset + 1

tokens = sorted(set(tokens))
print(f"Found {len(tokens)} BoardEffect related strings:")
for t in tokens:
    print("  ", t)

