import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

str_offset = 1257980
typedefs_off = 22414740
typedefs_size = 2570456
fields_off = 18926636

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# find exact null-terminated strings
def find_exact_str(target):
    target_b = b"\x00" + target.encode('utf-8') + b"\x00"
    pos = 0
    offs = []
    while True:
        idx = meta.find(target_b, str_offset + pos)
        if idx == -1 or idx >= str_offset + 3506404:
            break
        offs.append(idx - str_offset + 1)
        pos = idx - str_offset + 1
    return offs

for name in ["BoardEffect", "LightBoardEffect", "PlayerComp", "DefenderComp"]:
    offs = find_exact_str(name)
    print(f"Exact string '{name}': {offs}")
    for off in offs:
        # search in typedefs
        t_pos = 0
        while True:
            idx = meta.find(struct.pack('<I', off), typedefs_off + t_pos, typedefs_off + typedefs_size)
            if idx == -1: break
            rel = idx - typedefs_off
            ns_idx = struct.unpack('<I', meta[idx+4:idx+8])[0]
            print(f"  Found TypeDef for {name} (ns='{get_str(ns_idx)}') at rel {rel} (0x{rel:X})")
            t_pos = rel + 4

