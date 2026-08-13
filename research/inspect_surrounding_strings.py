import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

str_offset = 1257980
# Let's inspect strings around 1935036
start_pos = str_offset + 1935036 - 1000
end_pos = str_offset + 1935036 + 2000

sub_data = meta[start_pos:end_pos]
strings = [s.decode('utf-8', errors='ignore') for s in sub_data.split(b'\x00') if len(s) > 0]

print(f"Strings around BoardEffect ({len(strings)}):")
for s in strings:
    print("  ", s)
