import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

header = struct.unpack('<64I', meta[:256])

# Offsets in v39:
str_offset = header[6]
methods_offset = header[12]
methods_size = header[13]
params_offset = header[22]
fields_offset = header[24]
typedefs_offset = header[40]
typedefs_size = header[41]
images_offset = header[42]
images_size = header[43]

print(f"TypeDefs offset: {typedefs_offset}, size: {typedefs_size}")
print(f"Methods offset: {methods_offset}, size: {methods_size}")

def get_str(idx):
    if idx < 0:
        return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# Il2CppTypeDefinition in Unity 2022.3 (Metadata v29-v39) is usually 88 or 92 bytes.
# Let's inspect a type definition entry:
# nameIndex (4), namespaceIndex (4), customAttributeIndex (4), assemblyIndex (4), byvalTypeIndex (4), declaringTypeIndex (4),
# parentTypeIndex (4), elementTypeIndex (4), rgctxStartIndex (4), rgctxCount (4), genericContainerIndex (4), flags (4),
# fieldStart (4), methodStart (4), eventStart (4), propertyStart (4), nestedTypesStart (4), interfacesStart (4),
# vtableStart (4), interfaceOffsetsStart (4), method_count (2), property_count (2), field_count (2), event_count (2),
# nested_type_count (2), vtable_count (2), interfaces_count (2), interface_offsets_count (2), bitfield (4)
# Total: 20*4 + 8*2 + 4 = 80 + 16 + 4 = 100 bytes (or 88/92 bytes depending on layout)

# Let's determine the exact struct size of TypeDefinition
for candidate_size in [88, 92, 96, 100, 104, 108, 112, 116, 120]:
    cnt = typedefs_size // candidate_size
    valid_count = 0
    for i in range(min(50, cnt)):
        entry = meta[typedefs_offset + i*candidate_size : typedefs_offset + (i+1)*candidate_size]
        name_idx, ns_idx = struct.unpack('<II', entry[:8])
        name = get_str(name_idx)
        ns = get_str(ns_idx)
        if name and (name[0].isalpha() or name[0] in '<_'):
            valid_count += 1
    print(f"Candidate size {candidate_size}: {valid_count}/50 valid names")

