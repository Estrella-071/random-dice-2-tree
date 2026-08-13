import struct

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
with open(framework_path, 'rb') as f:
    macho = f.read()

data_start = 0xc341e20
data_len = 0x8eadc8 + 0x6eac4d
data_slice = macho[data_start : data_start + data_len]

# Search for pointer arrays where all elements point into __DATA_CONST or __DATA
# and the pointees look like Il2CppCodeGenModule
num_qwords = data_len // 8
print(f"Scanning {num_qwords} qwords for codeGenModules array...")

candidates = []
for i in range(num_qwords - 50):
    # check if next 20 pointers all point to data_slice
    valid = True
    for j in range(20):
        ptr = struct.unpack('<Q', data_slice[(i+j)*8 : (i+j+1)*8])[0]
        if not (data_start <= ptr < data_start + data_len):
            valid = False
            break
    if valid:
        # how long is this array?
        length = 0
        while i + length < num_qwords:
            ptr = struct.unpack('<Q', data_slice[(i+length)*8 : (i+length+1)*8])[0]
            if not (data_start <= ptr < data_start + data_len):
                break
            length += 1
        if 50 <= length <= 500:
            arr_addr = data_start + i*8
            print(f"Found pointer array at {hex(arr_addr)}, length={length}")
            candidates.append((arr_addr, length))

