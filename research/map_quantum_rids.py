import struct

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
with open(framework_path, 'rb') as f:
    macho = f.read()

# Let's inspect the 2207 pointer blocks we found earlier in __DATA_CONST / __DATA
# In earlier scan, we found blocks like:
# Addr 0xcf55030: count=176
# Addr 0xd306380: count=165
# Addr 0xd322958: count=153
# ...
# Wait! In Unity 2022.3, is there an array of method pointers for Quantum.Simulation?
# Let's find all pointer arrays that contain ARM64 function pointers.
# In Quantum.Simulation.dll, how many methods are there in total?
# Let's check token range in Quantum.Simulation.dll

# In metadata:
# Let's find all methods belonging to Quantum.Simulation.dll
metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

methods_off = 5541704
str_offset = 1257980

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# Quantum.Simulation methods are from mid=115xxx to 120xxx
# Let's find all methods in Quantum.Simulation.dll and list their names and tokens
q_methods = []
for mid in range(114000, 122000):
    off = methods_off + mid * 32
    name_idx, decl_type, ret_type, param_start, gen_container, token, flags, iflags, slot, param_cnt = struct.unpack('<iiiiIIHHHH', meta[off:off+32])
    name = get_str(name_idx)
    # check if token starts with 0x06000000
    if (token & 0xFF000000) == 0x06000000:
        rid = token & 0x00FFFFFF
        q_methods.append((mid, rid, name))

print(f"Total methods in range: {len(q_methods)}")
print(f"Min RID: {min(r for _, r, _ in q_methods)}, Max RID: {max(r for _, r, _ in q_methods)}")

# Sort by RID
q_methods.sort(key=lambda x: x[1])
print("First 5 methods:", q_methods[:5])
print("Last 5 methods:", q_methods[-5:])

# Let's check where ApplyLightBoardBuffs is in this sorted list
for idx, (mid, rid, name) in enumerate(q_methods):
    if name in ["ApplyLightBoardBuffs", "AddBoardEffect", "UpdateResonanceBuff", "CheckStatBuff4Defender"]:
        print(f"Method {name}: mid={mid}, RID={hex(rid)} ({rid}), index in module={idx}")

