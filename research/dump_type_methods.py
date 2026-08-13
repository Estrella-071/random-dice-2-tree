import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"

with open(metadata_path, 'rb') as f:
    meta = f.read()

methods_off = 5541704
str_offset = 1257980

def get_str(idx):
    if idx < 0:
        return ""
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
        'declaring_type_index': decl_type,
        'param_start': param_start,
        'param_count': param_cnt
    }

# Let's inspect methods around these indices
for base_mid in [116524, 117011, 117613]:
    info = get_method_info(base_mid)
    decl_type = info['declaring_type_index']
    print(f"\n=== Declaring Type Index {decl_type} (Sample method: {info['name']}) ===")
    # scan for all methods with this declaring_type_index
    num_methods = 7016320 // 32
    type_methods = []
    for mid in range(num_methods):
        m = get_method_info(mid)
        if m['declaring_type_index'] == decl_type:
            type_methods.append(m)
    for m in type_methods:
        print(f"  [{m['id']}] {m['name']} (params: {m['param_count']})")

