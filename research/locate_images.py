import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"

with open(metadata_path, 'rb') as f:
    meta = f.read()

# Let's inspect images table in metadata
# Header offset for images: 24985196 (0x17D3E6C), count: 7848 bytes
# Let's check size of Il2CppImageDefinition (usually 32 or 40 bytes)
header = struct.unpack('<64I', meta[:256])
str_offset = 1257980

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

images_off = 24985196
images_size = 7848

# ImageDefinition usually:
# nameIndex (4), assemblyIndex (4), typeStart (4), typeCount (4), exportedTypeStart (4), exportedTypeCount (4), entryPointIndex (4), token (4), customAttributeStart (4), customAttributeCount (4)
# That's 40 bytes or 32 bytes (if no custom attributes)
print("Parsing images...")
for isize in [24, 28, 32, 36, 40]:
    cnt = images_size // isize
    imgs = []
    for i in range(cnt):
        entry = meta[images_off + i*isize : images_off + (i+1)*isize]
        name_idx, assem_idx, type_start, type_cnt = struct.unpack('<IIII', entry[:16])
        name = get_str(name_idx)
        imgs.append((name, type_start, type_cnt))
    valid = sum(1 for name, _, _ in imgs if name.endswith('.dll'))
    print(f"Image struct size {isize}: {valid}/{cnt} valid image names")
    if valid > 50:
        for name, ts, tc in imgs:
            if any(k in name.lower() for k in ['quantum', 'assembly-csharp', 'dice']):
                print(f"  Target Image: {name}, typeStart={ts}, typeCount={tc}")

