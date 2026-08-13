import struct
import os

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    header_data = f.read(256)
    sanity, version = struct.unpack('<II', header_data[:8])
    print(f"Sanity: 0x{sanity:X}, Version: {version}")

# Sanity should be 0xFAB11BAF
