import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

str_offset = 1257980
fields_off = 18926636
fields_size = 1461192

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# Search for TypeDefinition of "BoardEffect"
# Let's search all TypeDefinition entries in metadata where name == "BoardEffect"
typedefs_off = 22414740
typedefs_size = 2570456

# In Unity 2022.3, TypeDefinition struct has fields:
# nameIndex, namespaceIndex, customAttributeIndex, assemblyIndex, byvalTypeIndex, declaringTypeIndex, parentTypeIndex,
# elementTypeIndex, rgctxStartIndex, rgctxCount, genericContainerIndex, flags, fieldStart, methodStart...
# Let's find TypeDefinition of "BoardEffect"
target_str = b"BoardEffect\x00"
str_idx = meta.find(target_str, str_offset) - str_offset

print(f"String index of 'BoardEffect': {str_idx}")

# Search in typedefs table
pos = 0
while True:
    idx = meta.find(struct.pack('<I', str_idx), typedefs_off + pos, typedefs_off + typedefs_size)
    if idx == -1: break
    rel = idx - typedefs_off
    print(f"Found TypeDef at rel offset {rel} (0x{rel:X})")
    # Read TypeDefinition fields
    # Let's print the uint32 array around idx
    raw = meta[idx:idx+96]
    uints = struct.unpack('<24I', raw)
    print(f"  Name: {get_str(uints[0])}, Namespace: {get_str(uints[1])}")
    print(f"  fieldStart: {uints[12]}, methodStart: {uints[13]}")
    ushorts = struct.unpack('<48H', raw)
    print(f"  fieldCount: {ushorts[26]}, methodCount: {ushorts[24]}")
    field_start = uints[12]
    field_cnt = ushorts[26]
    print(f"  Fields ({field_cnt}):")
    for f in range(min(field_cnt, 20)):
        # FieldDefinition is 12 or 8 bytes in Unity 2022 (nameIndex, typeIndex, token)
        foff = fields_off + (field_start + f) * 12
        f_name_idx = struct.unpack('<I', meta[foff:foff+4])[0]
        print(f"    - {get_str(f_name_idx)}")
    pos = rel + 4

