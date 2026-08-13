import struct

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
with open(framework_path, 'rb') as f:
    macho = f.read()

# Let's find sections in Mach-O
# __TEXT,__text is from 0x4000 to 0x4000 + 0x35a988c (VA 0x4000 to 0x35ad88c)
# __DATA_CONST,__const is from 0xc341e20, size 0x8eadc8
# __DATA,__data is from 0xcf39700, size 0x6eac4d

text_start = 0x4000
text_end = 0x4000 + 0x35a988c

print(f"Text range: {hex(text_start)} - {hex(text_end)}")

# Let's search for an array of 64-bit pointers that all fall within text_start and text_end
# The array should have > 50,000 pointers
pos = 0xc341e20
data_to_search = macho[0xc341e20 : 0xc341e20 + 0x8eadc8 + 0x6eac4d]
num_qwords = len(data_to_search) // 8

print(f"Scanning {num_qwords} qwords for methodPointers array...")

best_start = -1
best_len = 0
cur_start = -1
cur_len = 0

for i in range(num_qwords):
    val = struct.unpack('<Q', data_to_search[i*8 : i*8+8])[0]
    if text_start <= val < text_end:
        if cur_len == 0:
            cur_start = i
        cur_len += 1
    else:
        if cur_len > best_len:
            best_len = cur_len
            best_start = cur_start
        cur_len = 0

if cur_len > best_len:
    best_len = cur_len
    best_start = cur_start

print(f"Longest pointer array found: start offset={hex(0xc341e20 + best_start*8)}, length={best_len} pointers")

# If best_len > 50000, that's our methodPointers array!
method_pointers_file_offset = 0xc341e20 + best_start * 8

# Let's get the function pointer for our method indices:
# 116524: GetAttackIntervalByRatio
# 117011: UpdateResonanceBuff
# 117012: AccumulateResonanceFromBoard
# 117613: ApplyLightBoardBuffs

target_methods = {
    116524: "GetAttackIntervalByRatio",
    117011: "UpdateResonanceBuff",
    117012: "AccumulateResonanceFromBoard",
    117613: "ApplyLightBoardBuffs"
}

for mid, name in target_methods.items():
    if mid < best_len:
        ptr = struct.unpack('<Q', macho[method_pointers_file_offset + mid*8 : method_pointers_file_offset + mid*8 + 8])[0]
        print(f"Method {name} (index {mid}) -> VA: {hex(ptr)}, FileOffset: {hex(ptr)}")

