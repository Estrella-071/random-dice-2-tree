import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

str_offset = 1257980
methods_off = 5541704
params_off = 15888512 # 0xF27080, size: 3038124

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# Il2CppParameterDefinition in Unity 2022 is 8 bytes (nameIndex: 4, token: 4, typeIndex: 4 -> 12 bytes or 8 bytes)
for psize in [8, 12, 16]:
    off = methods_off + 117012 * 32
    name_idx, decl_type, ret_type, param_start, gen_container, token, flags, iflags, slot, param_cnt = struct.unpack('<iiiiIIHHHH', meta[off:off+32])
    m_name = get_str(name_idx)
    params = []
    for i in range(param_cnt):
        p_off = params_off + (param_start + i) * psize
        p_name_idx = struct.unpack('<I', meta[p_off:p_off+4])[0]
        params.append(get_str(p_name_idx))
    print(f"psize {psize}: Method {m_name}({', '.join(params)})")

