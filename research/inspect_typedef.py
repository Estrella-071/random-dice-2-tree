import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"

with open(metadata_path, 'rb') as f:
    meta = f.read()

str_offset = 1257980
methods_off = 5541704
typedefs_off = 22414740

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

# Let's inspect the raw bytes of TypeDefinition around LightBoardEffect (1238692)
for name, rel_off in [("LightBoardEffect", 1238692), ("PlayerComp", 1227950), ("DefenderComp", 1225900), ("AttackSpeedUpAllSkill", 1236478), ("SpawnResonanceSkill", 1241890)]:
    abs_off = typedefs_off + rel_off
    # unpack as uint32
    uints = struct.unpack('<24I', meta[abs_off:abs_off+96])
    print(f"\n=== {name} (rel_off={rel_off}) ===")
    print(f"Name: {get_str(uints[0])}, Namespace: {get_str(uints[1])}")
    print(f"uints: {uints}")
    # Let's find which uint corresponds to methodStart and methodCount
    # Usually method_count is uint16 in the latter part of struct
    # Let's also unpack as uint16
    ushorts = struct.unpack('<48H', meta[abs_off:abs_off+96])
    print(f"ushorts: {ushorts[24:]}")

