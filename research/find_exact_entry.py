import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

str_offset = 1257980
typedefs_off = 22414740
typedefs_size = 2570456

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# We found name "BoardEffect" string offset is 1935036 (0x1D86BC)
# In TypeDefinition, nameIndex is the FIRST field (int32)
# So the TypeDefinition start is EXACTLY where 1935036 is found in typedefs table!
target_bytes = struct.pack('<I', 1935036)
pos = 0
while True:
    idx = meta.find(target_bytes, typedefs_off + pos, typedefs_off + typedefs_size)
    if idx == -1: break
    rel = idx - typedefs_off
    print(f"TypeDefinition starts at {rel} (0x{rel:X})")
    # Let's inspect the next 88 bytes
    entry = meta[idx:idx+88]
    # Let's unpack all uint32s
    uints = struct.unpack('<22I', entry)
    print("uint32s:", uints)
    # Check namespace
    ns = get_str(uints[1])
    print(f"Name: {get_str(uints[0])}, Namespace: {ns}")
    pos = rel + 4

