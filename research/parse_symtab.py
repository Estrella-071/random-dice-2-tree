import struct

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"

with open(framework_path, 'rb') as f:
    # Read load commands to find LC_SYMTAB
    f.seek(32)
    header = f.read(4)
    # Read symtab info
    symoff = 0xd970c00
    nsyms = 38428
    stroff = 0xda12538
    strsize = 0x1e4760
    
    # Read string table
    f.seek(stroff)
    strtab = f.read(strsize)
    
    # Read nlist_64 entries (16 bytes each)
    f.seek(symoff)
    nlist_data = f.read(nsyms * 16)

def get_sym_str(idx):
    if idx < 0 or idx >= len(strtab): return ""
    end = strtab.find(b'\x00', idx)
    if end != -1:
        return strtab[idx:end].decode('utf-8', errors='ignore')
    return ""

print("Scanning symbol table...")
matched_symbols = []
for i in range(nsyms):
    n_strx, n_type, n_sect, n_desc, n_value = struct.unpack('<IBBhQ', nlist_data[i*16 : (i+1)*16])
    sym_name = get_sym_str(n_strx)
    if any(k in sym_name.lower() for k in ['boardeffect', 'light', 'attackspeed', 'resonance', 'defendercomp', 'playercomp']):
        matched_symbols.append((sym_name, n_value, n_sect))

print(f"Found {len(matched_symbols)} matching symbols:")
for name, val, sect in matched_symbols[:50]:
    print(f"  {hex(val)} (sect {sect}): {name}")

with open("research/macho_symbols.txt", "w", encoding="utf-8") as out:
    for name, val, sect in matched_symbols:
        out.write(f"{hex(val)}: {name}\n")
