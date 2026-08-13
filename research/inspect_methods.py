import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

str_offset = 1257980
methods_off = 5541704
params_off = 15888512
fields_off = 18926636

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

def get_param_name(pid):
    # ParamDefinition: nameIndex (4), token (4), typeIndex (4) -> 12 bytes
    off = params_off + pid * 12
    name_idx = struct.unpack('<I', meta[off:off+4])[0]
    return get_str(name_idx)

# Let's inspect the methods
for mid in [116524, 117011, 117012, 117013, 117613, 117030, 117031, 117038, 117047, 117051]:
    off = methods_off + mid * 32
    name_idx, decl_type, ret_type, param_start, gen_container, token, flags, iflags, slot, param_cnt = struct.unpack('<iiiiIIHHHH', meta[off:off+32])
    m_name = get_str(name_idx)
    params = [get_param_name(param_start + i) for i in range(param_cnt)]
    print(f"Method [{mid}] {m_name}({', '.join(params)}) - declType: {decl_type}")

