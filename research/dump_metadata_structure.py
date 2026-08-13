import struct
import os

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"

with open(metadata_path, 'rb') as f:
    data = f.read()

header = struct.unpack('<64I', data[:256])
sanity = header[0]
version = header[1]
print(f"Sanity: {hex(sanity)}, Version: {version}")

# Header layout for Unity 2021/2022/2023 (Metadata v29-v31/v39):
# 0: sanity (4)
# 1: version (4)
# 2: stringLiteralOffset (4)
# 3: stringLiteralCount (4)
# 4: stringLiteralDataOffset (4)
# 5: stringLiteralDataCount (4)
# 6: stringOffset (4)
# 7: stringCount (4)
# 8: eventsOffset (4)
# 9: eventsCount (4)
# 10: propertiesOffset (4)
# 11: propertiesCount (4)
# 12: methodsOffset (4)
# 13: methodsCount (4)
# 14: parameterDefaultValuesOffset (4)
# 15: parameterDefaultValuesCount (4)
# 16: fieldDefaultValuesOffset (4)
# 17: fieldDefaultValuesCount (4)
# 18: fieldAndParameterDefaultValueDataOffset (4)
# 19: fieldAndParameterDefaultValueDataCount (4)
# 20: fieldMarshaledSizesOffset (4)
# 21: fieldMarshaledSizesCount (4)
# 22: parametersOffset (4)
# 23: parametersCount (4)
# 24: fieldsOffset (4)
# 25: fieldsCount (4)
# 26: genericParametersOffset (4)
# 27: genericParametersCount (4)
# 28: genericParameterConstraintsOffset (4)
# 29: genericParameterConstraintsCount (4)
# 30: genericContainersOffset (4)
# 31: genericContainersCount (4)
# 32: nestedTypesOffset (4)
# 33: nestedTypesCount (4)
# 34: interfacesOffset (4)
# 35: interfacesCount (4)
# 36: vtableMethodsOffset (4)
# 37: vtableMethodsCount (4)
# 38: interfaceOffsetsOffset (4)
# 39: interfaceOffsetsCount (4)
# 40: typeDefinitionsOffset (4)
# 41: typeDefinitionsCount (4)
# 42: imagesOffset (4)
# 43: imagesCount (4)
# 44: assembliesOffset (4)
# 45: assembliesCount (4)

def get_str(offset):
    str_offset = header[6] + offset
    end = data.find(b'\x00', str_offset)
    if end != -1:
        return data[str_offset:end].decode('utf-8', errors='ignore')
    return ""

def get_string_literal(index):
    # stringLiteral is at header[2]
    # Each entry: uint32 length, uint32 dataOffset
    sl_offset = header[2] + index * 8
    length, data_offset = struct.unpack('<II', data[sl_offset:sl_offset+8])
    sldata_offset = header[4] + data_offset
    return data[sldata_offset:sldata_offset+length].decode('utf-8', errors='ignore')

typeDefsOffset = header[40]
typeDefsCount = header[41] // 88 # Unity 2022 / v29+ TypeDefinition size is 88 or 92/100, let's check size

print(f"typeDefsOffset: {typeDefsOffset}, total bytes: {header[41]}")

# Let's inspect images (assemblies)
imagesOffset = header[42]
imagesCount = header[43] // 32 # or 40
print(f"imagesOffset: {imagesOffset}, count bytes: {header[43]}")

# Let's list all methods or type names by scanning string table directly or typeDefs
