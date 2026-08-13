import struct

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
with open(framework_path, 'rb') as f:
    macho = f.read()

# Let's search in __DATA_CONST and __DATA for an array of 2869 pointers
data_start = 0xc334000
data_len = 0x9a8000 + 0x94c000
data_slice = macho[data_start : data_start + data_len]
text_start = 0x4000
text_end = 0x35ad88c

# Search for continuous array of pointers to text of length >= 2000
num_qwords = len(data_slice) // 8
for i in range(num_qwords - 2000):
    # check if 100 pointers point to text
    if all(text_start <= struct.unpack('<Q', data_slice[(i+k)*8:(i+k+1)*8])[0] < text_end for k in range(100)):
        # count length
        l = 0
        while i + l < num_qwords and text_start <= struct.unpack('<Q', data_slice[(i+l)*8:(i+l+1)*8])[0] < text_end:
            l += 1
        if l > 1000:
            print(f"Found large method array at {hex(data_start + i*8)}, length={l}")

