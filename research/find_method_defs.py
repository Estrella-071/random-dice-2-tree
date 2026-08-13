import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"

with open(metadata_path, 'rb') as f:
    meta = f.read()

# Methods offset: 5541704, size: 7016320
methods_off = 5541704
methods_size = 7016320

# Let's test struct size of MethodDefinition (usually 32 or 28 or 24 or 36 bytes in v29+)
# Let's find matches for nameIndex
targets = {
    1935292: "GetAttackIntervalByRatio",
    1954535: "ApplyLightBoardBuffs",
    1947371: "UpdateResonanceBuff",
    1947440: "AccumulateResonanceFromBoard",
    1947469: "CountSameLevelResonanceDice"
}

for rsize in [24, 28, 32, 36, 40, 44]:
    num_methods = methods_size // rsize
    found = {}
    for i in range(num_methods):
        name_idx = struct.unpack('<I', meta[methods_off + i*rsize : methods_off + i*rsize + 4])[0]
        if name_idx in targets:
            found[targets[name_idx]] = i
    if len(found) >= 3:
        print(f"Match for struct size {rsize}: {found}")

