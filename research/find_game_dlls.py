import os

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    data = f.read()

# find all .dll names
import re
dll_matches = [m.start() for m in re.finditer(rb'[A-Za-z0-9_\.]+\.dll\x00', data)]
print(f"Found {len(dll_matches)} dll occurrences")

for offset in dll_matches:
    end = data.find(b'\x00', offset)
    dll_name = data[offset:end].decode('latin1')
    print(f"DLL at {offset}: {dll_name}")
    # let's grab next 200 strings
    chunk = data[end+1:end+20000]
    tokens = [t.decode('latin1') for t in chunk.split(b'\x00') if len(t) > 0][:50]
    # print sample
    print(f"  First few symbols: {tokens[:5]}")
    if any(k in dll_name.lower() for k in ['quantum', 'game', 'assembly', 'dice']):
        print(f"  *** MATCHED DLL: {dll_name} ***")
        # save all symbols for this DLL
        chunk_large = data[end+1:end+500000]
        dll_tokens = [t.decode('latin1') for t in chunk_large.split(b'\x00') if len(t) > 0]
        with open(f"research/dll_{dll_name}.txt", "w", encoding="utf-8") as out:
            for t in dll_tokens:
                out.write(t + "\n")
