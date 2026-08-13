import struct

# Let's inspect UnityFramework binary and find where AddBoardEffect and ApplyLightBoardBuffs actually point.
framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"

with open(metadata_path, 'rb') as f:
    meta = f.read()

# Let's check metadata header to get exact table offsets
# We need to disassemble the exact function instructions for ApplyLightBoardBuffs and AddBoardEffect
# How to find the exact function address of ApplyLightBoardBuffs / AddBoardEffect / GetAttackIntervalByRatio?
# Let's find exported symbols, or string references, or IL2CPP metadata registration.

# Let's check if there are any symbols in LC_SYMTAB
with open(framework_path, 'rb') as f:
    macho = f.read(65536)

# Read Mach-O load commands
offset = 32
ncmds = struct.unpack('<I', macho[16:20])[0]
symoff = 0
nsyms = 0
stroff = 0
strsize = 0

for _ in range(ncmds):
    cmd, cmdsize = struct.unpack('<II', macho[offset:offset+8])
    if cmd == 2: # LC_SYMTAB
        symoff, nsyms, stroff, strsize = struct.unpack('<IIII', macho[offset+8:offset+24])
        print(f"LC_SYMTAB: symoff={hex(symoff)}, nsyms={nsyms}, stroff={hex(stroff)}, strsize={hex(strsize)}")
        break
    offset += cmdsize

print(f"Symtab found: nsyms={nsyms}")
