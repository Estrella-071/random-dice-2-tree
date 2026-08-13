import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"

with open(metadata_path, 'rb') as f:
    meta = f.read()

# Let's search all TypeDefinition entries in typedefs_off (22414740)
# We know names of types like 'LightBoardEffect', 'PlayerComp', 'DefenderSkill', 'QuantumUser'
# Let's find their string offsets
str_offset = 1257980
def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

def find_str_offset(s):
    sb = s.encode('utf-8')
    pos = 0
    res = []
    while True:
        idx = meta.find(sb, str_offset + pos)
        if idx == -1 or idx >= str_offset + 3506404:
            break
        res.append(idx - str_offset)
        pos = idx - str_offset + 1
    return res

target_name_offsets = {}
for name in ["LightBoardEffect", "PlayerComp", "DefenderComp", "AttackSpeedUpAllSkill", "SpawnResonanceSkill"]:
    offs = find_str_offset(name)
    target_name_offsets[name] = offs
    print(f"{name}: {offs}")

# Now search for these uint32 offsets in typedefs_off
typedefs_off = 22414740
typedefs_size = 2570456

for name, offs in target_name_offsets.items():
    for off in offs:
        off_bytes = struct.pack('<I', off)
        pos = 0
        while True:
            idx = meta.find(off_bytes, typedefs_off + pos, typedefs_off + typedefs_size)
            if idx == -1:
                break
            rel_off = idx - typedefs_off
            print(f"Found name '{name}' (str_off={off}) in TypeDefinition table at relative offset {rel_off} (0x{rel_off:X})")
            pos = rel_off + 4

