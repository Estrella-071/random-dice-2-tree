import struct

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
with open(framework_path, 'rb') as f:
    macho = f.read()

# Let's search all arrays of pointers into __TEXT,__text (0x4000 to 0x35ad88c)
text_start = 0x4000
text_end = 0x35ad88c

# Let's scan all of __DATA_CONST and __DATA for any continuous block of >= 5 pointers to text
data_start = 0xc334000
data_len = 0x9a8000 + 0x94c000
data_slice = macho[data_start : data_start + data_len]
num_qwords = len(data_slice) // 8

blocks = []
cur_start = -1
cur_len = 0

for i in range(num_qwords):
    ptr = struct.unpack('<Q', data_slice[i*8 : i*8+8])[0]
    if text_start <= ptr < text_end:
        if cur_len == 0:
            cur_start = i
        cur_len += 1
    else:
        if cur_len >= 5:
            blocks.append((data_start + cur_start*8, cur_len))
        cur_len = 0
if cur_len >= 5:
    blocks.append((data_start + cur_start*8, cur_len))

print(f"Total method pointer blocks found: {len(blocks)}")
# Sort by length
blocks.sort(key=lambda x: x[1], reverse=True)
for addr, count in blocks[:30]:
    print(f"  Addr {hex(addr)}: count={count} methods")

