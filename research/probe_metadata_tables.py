import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    data = f.read()

# Let's inspect string table
# In metadata, let's find the method names and type names
# We know strings are at stringOffset
header = struct.unpack('<64I', data[:256])
print("Header sanity:", hex(header[0]), "version:", header[1])

# In v29+:
# let's find the exact offsets from header
# Let's print all (offset, count) pairs
for i in range(2, 40, 2):
    off = header[i]
    cnt = header[i+1]
    print(f"Header[{i//2}]: offset={off} (0x{off:X}), count/size={cnt} (0x{cnt:X})")

# Let's write a finder for method names in the string table
# Usually, in Il2CppMethodDefinition:
# nameIndex (int32), declaringType (int32), returnType (int32), parameterStart (int32), genericContainerIndex (int32), token (uint32), flags (uint16), iflags (uint16), slot (uint16), parameterCount (uint16)
# That's 32 bytes or 36 bytes in v29+

