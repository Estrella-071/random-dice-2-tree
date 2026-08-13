import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"

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
        'declaring_type_index': decl_type,
        'param_start': param_start,
        'param_count': param_cnt,
        'token': token
    }

# Find all methods containing "Light" in their name or declaring type
num_methods = 7016320 // 32
print(f"Scanning {num_methods} methods for 'Light'...")

light_methods = []
for mid in range(num_methods):
    m = get_method_info(mid)
    if 'light' in m['name'].lower():
        light_methods.append(m)

print(f"Found {len(light_methods)} methods with 'Light':")
for m in light_methods:
    print(f"  [{m['id']}] {m['name']} (params: {m['param_count']}, decl_type: {m['declaring_type_index']}, token: {hex(m['token'])})")

