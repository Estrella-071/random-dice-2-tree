import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"

with open(metadata_path, 'rb') as f:
    meta = f.read()

with open(framework_path, 'rb') as f:
    macho = f.read()

# Let's find the CodeGenModule for Quantum.Simulation.dll
# In Unity 2022.3 IL2CPP:
# Each CodeGenModule has:
# const char* moduleName
# uint32_t methodPointerCount
# const Il2CppMethodPointer* methodPointers
# ...

# We know method index for Quantum.Simulation starts around ~115000 and ends around ~120000.
# The methodPointerCount for Quantum.Simulation is around 3000 ~ 6000.
# Let's search all method pointer arrays in __DATA_CONST and __DATA for arrays with length around 2000 ~ 10000.

data_start = 0xc334000
data_len = 0x9a8000 + 0x94c000
data_slice = macho[data_start : data_start + data_len]
text_start = 0x4000
text_end = 0x35ad88c

num_qwords = len(data_slice) // 8

cur_start = -1
cur_len = 0
large_blocks = []

for i in range(num_qwords):
    ptr = struct.unpack('<Q', data_slice[i*8 : i*8+8])[0]
    if text_start <= ptr < text_end:
        if cur_len == 0:
            cur_start = i
        cur_len += 1
    else:
        if cur_len >= 500:
            large_blocks.append((data_start + cur_start*8, cur_len))
        cur_len = 0
if cur_len >= 500:
    large_blocks.append((data_start + cur_start*8, cur_len))

print(f"Large pointer arrays (>500): {len(large_blocks)}")
for addr, cnt in large_blocks:
    print(f"  Addr {hex(addr)}, count={cnt}")

# If no single array > 500, let's list all arrays > 50
if not large_blocks:
    for i in range(num_qwords):
        ptr = struct.unpack('<Q', data_slice[i*8 : i*8+8])[0]
        if text_start <= ptr < text_end:
            if cur_len == 0: cur_start = i
            cur_len += 1
        else:
            if cur_len >= 100:
                large_blocks.append((data_start + cur_start*8, cur_len))
            cur_len = 0
    print(f"Pointer arrays (>100): {len(large_blocks)}")
    for addr, cnt in large_blocks[:20]:
        print(f"  Addr {hex(addr)}, count={cnt}")

