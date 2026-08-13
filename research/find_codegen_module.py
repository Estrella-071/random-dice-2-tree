import struct

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
with open(framework_path, 'rb') as f:
    macho = f.read()

# Let's find "Quantum.Simulation.dll" in Mach-O
target_name = b"Quantum.Simulation.dll\x00"
pos = 0
found_str_offsets = []
while True:
    idx = macho.find(target_name, pos)
    if idx == -1:
        break
    found_str_offsets.append(idx)
    pos = idx + 1

print(f"Found '{target_name.decode('ascii')}' at string offsets: {[hex(x) for x in found_str_offsets]}")

# For each string offset, let's search for pointers to this string in __DATA_CONST or __DATA
for str_off in found_str_offsets:
    # 64-bit pointer is str_off (since in Mach-O __TEXT starts at 0, VA == fileoff)
    ptr_bytes = struct.pack('<Q', str_off)
    p_pos = 0
    while True:
        p_idx = macho.find(ptr_bytes, p_pos)
        if p_idx == -1:
            break
        print(f"  Pointer to string found at {hex(p_idx)}")
        # Let's inspect the CodeGenModule struct at p_idx:
        # 0: moduleName (ptr)
        # 8: methodPointerCount (uint32)
        # 16: methodPointers (ptr)
        mod_name_ptr, m_count, m_ptrs = struct.unpack('<QIQ', macho[p_idx:p_idx+24])
        print(f"    CodeGenModule: m_count={m_count}, m_ptrs={hex(m_ptrs)}")
        if 0 < m_count < 50000 and 0x4000 <= m_ptrs < len(macho):
            # Check first 5 pointers in m_ptrs
            sample_ptrs = [struct.unpack('<Q', macho[m_ptrs+i*8:m_ptrs+i*8+8])[0] for i in range(min(5, m_count))]
            print(f"    Sample method pointers: {[hex(p) for p in sample_ptrs]}")
        p_pos = p_idx + 1

