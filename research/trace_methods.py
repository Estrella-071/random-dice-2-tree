import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"

with open(metadata_path, 'rb') as f:
    meta = f.read()

with open(framework_path, 'rb') as f:
    macho = f.read()

str_offset = 1257980
methods_off = 5541704
typedefs_off = 22414740
images_off = 24985196

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# Let's inspect ImageDefinition for Quantum.Simulation.dll (image index 15)
# In image index 15:
# entry at images_off + 15 * 36
entry = meta[images_off + 15 * 36 : images_off + 16 * 36]
fields = struct.unpack('<9I', entry)
print(f"Quantum.Simulation Image fields: {fields}")
# fields: (nameIndex, assemblyIndex, typeStart, typeCount, exportedTypeStart, exportedTypeCount, entryPointIndex, token, customAttributeStart)
# In Unity 2022.3, ImageDefinition fields:
# nameIndex (0), assemblyIndex (1), typeStart (2), typeCount (3), exportedTypeStart (4), exportedTypeCount (5), entryPointIndex (6), token (7), customAttributeStart (8)
# Wait! Let's check typeStart = fields[2] or fields[7]?
# Earlier: [15] Quantum.Simulation.dll: fields = (1916801, 15, 37370277, 4294901760, 0, 4294967295, 1, 37618, 826)
# Notice: fields[7] = 37618, fields[8] = 826!
# That means in Unity 2022.3 (64-bit metadata):
# 0: nameIndex (4)
# 1: assemblyIndex (4)
# 2: customAttributeStart (4)
# 3: customAttributeCount (4)
# 4: exportedTypeStart (4)
# 5: exportedTypeCount (4)
# 6: entryPointIndex (4)
# 7: typeStart (4) = 37618
# 8: typeCount (4) = 826

type_start = fields[7]
type_count = fields[8]
print(f"typeStart={type_start}, typeCount={type_count}")

# Now let's find the methodStart for the first type and all methods in Quantum.Simulation.dll
# Let's find method range for Quantum.Simulation.dll
type_struct_size = 88 # or let's find methodStart from all types in this range
min_mid = 9999999
max_mid = -1

# Let's find PlayerComp TypeDef
# Earlier: PlayerComp was at rel offset 1227950 (which is byte offset from typedefs_off)
# TypeDef for PlayerComp has methods: 116947 to 117059!
print("PlayerComp method range: 116947 to 117059")
# AddBoardEffect is 117047!

