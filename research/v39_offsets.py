import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    meta = f.read()

header = struct.unpack('<64I', meta[:256])
sanity, version = header[0], header[1]
print(f"IL2CPP Metadata Version: {version}, Sanity: {hex(sanity)}")

# Let's inspect the offset table
# In metadata v29/31/39:
# 0: sanity
# 1: version
# 2: stringLiteralsOffset
# 3: stringLiteralsCount
# 4: stringLiteralDataOffset
# 5: stringLiteralDataCount
# 6: stringOffset
# 7: stringCount
# 8: eventsOffset
# 9: eventsCount
# 10: propertiesOffset
# 11: propertiesCount
# 12: methodsOffset
# 13: methodsCount
# ...

# Let's locate stringOffset and stringCount
# Wait, earlier:
# Header uint32s: (4205910959, 39, 380, 181884, 45471, 182264, 1075715, 45470, 1257980, 3506400, 187405, 4764380, ...)
# Let's verify string offset by reading string at offset 0 of string table:
# Let's check where the string table is.
# In earlier scan: Block at 1258171: 19780 tokens. Block at 1578292: 45448 tokens. Block at 2509219: 31075 tokens.
# Let's check string table offset: 1257980 (0x1331FC) or similar!
# Wait! Header[8] is 1257980, Header[9] is 3506400 (which is 1257980 + 3506400 = 4764380 = Header[11]!)
# So Header layout in v39 is:
# [2]: stringLiteralsOffset = 380, size = 181884
# [4]: stringLiteralDataOffset = 182264, size = 1075715 (wait! 45471*4? 182264 is 380+181884!)
# [6]: stringOffset = 1257980, size = 3506400!
# Let's check!
str_off = 1257980
str_size = 3506400
sample = meta[str_off:str_off+1000]
print("Sample string table:", sample[:200])

# Let's check methodsOffset and typeDefinitionsOffset
# [10]: 4764380, size = 14064
# [12]: 4778444, size = 763260 (methods offset!)
# [14]: 5541704, size = 7016320 (parameters offset or default values?)
# [16]: 12558024, size = 88656
# [18]: 12646680, size = 337164
# [20]: 12983848, size = 2811627
# [22]: 15795476, size = 93036
# [24]: 15888512, size = 3038124
# [26]: 18926636, size = 1461192
# [28]: 20387828, size = 231756
# [30]: 20619584, size = 25044 (typeDefinitionsOffset!)
# [32]: 20644628, size = 145152
