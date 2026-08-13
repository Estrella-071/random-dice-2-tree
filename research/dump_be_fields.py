import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

str_offset = 1257980
typedefs_off = 22414740
fields_off = 18926636

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# Let's inspect fields of BoardEffect (rel 1223686)
idx = typedefs_off + 1223686
raw = meta[idx:idx+96]
uints = struct.unpack('<24I', raw)
ushorts = struct.unpack('<48H', raw)

print("BoardEffect TypeDef:")
print(f"  Name: {get_str(uints[0])}, Namespace: {get_str(uints[1])}")
print(f"  fieldStart: {uints[12]}, methodStart: {uints[13]}")
print(f"  fieldCount: {ushorts[26]}, methodCount: {ushorts[24]}")

# Let's find field size (8 or 12 or 16 bytes)
# In Unity 2022.3, FieldDefinition is nameIndex(4), typeIndex(4), token(4) -> 12 bytes
# Let's dump all fields of BoardEffect
field_start = uints[12]
field_cnt = ushorts[26]

for fsize in [8, 12, 16]:
    print(f"\n--- Testing field struct size {fsize} ---")
    fields = []
    for i in range(field_cnt):
        foff = fields_off + (field_start + i) * fsize
        name_idx = struct.unpack('<I', meta[foff:foff+4])[0]
        fields.append(get_str(name_idx))
    print(f"Fields: {fields}")

