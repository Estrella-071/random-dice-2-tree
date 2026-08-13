import struct
import re

# Let's search strings in global-metadata and find method index or string usages
metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"

with open(metadata_path, 'rb') as f:
    meta = f.read()

# Let's find string table
# In v39: string table at 1257980
str_offset = 1257980
def get_str(idx):
    if idx < 0 or idx >= 3506404:
        return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# Let's find all occurrences of method names
def find_str_indices(sub):
    results = []
    pos = 0
    sub_b = sub.encode('utf-8')
    while True:
        idx = meta.find(sub_b, str_offset + pos)
        if idx == -1 or idx >= str_offset + 3506404:
            break
        # make sure it starts at a null boundary or pos
        results.append(idx - str_offset)
        pos = idx - str_offset + 1
    return results

print("Looking for string offsets...")
for name in ["GetAttackIntervalByRatio", "ApplyLightBoardBuffs", "UpdateResonanceBuff", "AccumulateResonanceFromBoard", "CountSameLevelResonanceDice"]:
    offs = find_str_indices(name)
    print(f"String '{name}': {offs}")

