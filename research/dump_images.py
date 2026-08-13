import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"

with open(metadata_path, 'rb') as f:
    meta = f.read()

str_offset = 1257980
images_off = 24985196
images_size = 7848

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

isize = 36
cnt = images_size // isize
for i in range(cnt):
    entry = meta[images_off + i*isize : images_off + (i+1)*isize]
    fields = struct.unpack('<9I', entry)
    name = get_str(fields[0])
    if any(k in name.lower() for k in ['quantum', 'assembly-csharp', 'dice']):
        print(f"[{i}] {name}: fields = {fields}")
