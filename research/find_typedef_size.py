import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"

with open(metadata_path, 'rb') as f:
    meta = f.read()

# Let's inspect TypeDefinition table
# In metadata: typeDefinitionsOffset at 22414740 (0x1560594), size 2570456
typedefs_off = 22414740
typedefs_size = 2570456
str_offset = 1257980
methods_off = 5541704

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

def get_method_name(mid):
    off = methods_off + mid * 32
    name_idx = struct.unpack('<i', meta[off:off+4])[0]
    return get_str(name_idx)

# Let's find struct size of TypeDefinition
# Total types in Quantum.Simulation.dll starts at 37618, count 826
# Let's scan candidate struct sizes (around 68, 72, 76, 80, 84, 88, 92, 96, 100)
for tsize in [68, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112]:
    total_types = typedefs_size // tsize
    if 37618 + 826 <= total_types:
        # check if types in 37618..37618+50 have Quantum namespace
        sample_names = []
        for tid in range(37618, 37618 + 20):
            entry = meta[typedefs_off + tid*tsize : typedefs_off + (tid+1)*tsize]
            name_idx, ns_idx = struct.unpack('<II', entry[:8])
            name = get_str(name_idx)
            ns = get_str(ns_idx)
            sample_names.append(f"{ns}.{name}")
        valid_quantum = sum(1 for s in sample_names if 'Quantum' in s or 'RD2' in s)
        print(f"Type struct size {tsize}: {valid_quantum}/20 have Quantum namespace. Sample: {sample_names[:3]}")

