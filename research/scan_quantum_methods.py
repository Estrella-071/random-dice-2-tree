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

def get_method_name(mid):
    off = methods_off + mid * 32
    name_idx = struct.unpack('<i', meta[off:off+4])[0]
    return get_str(name_idx)

# Method indices in Quantum.Simulation:
# Let's inspect methods from 116000 to 118000
first_q_mid = None
last_q_mid = None
for mid in range(115000, 125000):
    off = methods_off + mid * 32
    name_idx, decl_type, ret_type = struct.unpack('<iii', meta[off:off+12])
    name = get_str(name_idx)
    # Check if name is known Quantum simulation method
    if name in ["AddBoardEffect", "ApplyLightBoardBuffs", "SpawnDefender", "UpdateResonanceBuff"]:
        print(f"Found method {name} at global method index {mid}")

# Let's find all methods in Quantum.Simulation.dll
# By scanning declaringType or image
# Let's count how many methods belong to Quantum.Simulation.dll

