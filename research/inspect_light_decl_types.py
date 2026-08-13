import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

str_offset = 1257980
methods_off = 5541704
typedefs_off = 22414740
fields_off = 18926636

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

def get_method_info(mid):
    off = methods_off + mid * 32
    name_idx, decl_type, ret_type, param_start, gen_container, token, flags, iflags, slot, param_cnt = struct.unpack('<iiiiIIHHHH', meta[off:off+32])
    return {
        'id': mid,
        'name': get_str(name_idx),
        'decl_type': decl_type,
        'token': token,
        'param_cnt': param_cnt
    }

# Declaring type for ApplyLightBoardBuffs is 1470053122
# Declaring type for ApplyLightDefenderRuneEffect is 1470053278
for dt in [1470053122, 1470053278]:
    print(f"\n=== Methods of declaring type {dt} ===")
    num_methods = 7016320 // 32
    for mid in range(num_methods):
        m = get_method_info(mid)
        if m['decl_type'] == dt:
            print(f"  [{m['id']}] {m['name']} (params: {m['param_cnt']}, token: {hex(m['token'])})")

