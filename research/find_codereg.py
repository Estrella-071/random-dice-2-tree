import struct

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
with open(framework_path, 'rb') as f:
    macho = f.read()

# Let's search in __DATA_CONST (0xc341e20) and __DATA (0xcf39700) for a uint64 equal to 218 (0xDA) or 217 or 216
data_start = 0xc341e20
data_len = 0x8eadc8 + 0x6eac4d
data_slice = macho[data_start : data_start + data_len]

for count in [217, 218, 219, 220, 221, 222, 223, 224, 225]:
    val_b = struct.pack('<Q', count)
    pos = 0
    while True:
        idx = data_slice.find(val_b, pos)
        if idx == -1: break
        abs_addr = data_start + idx
        # Check next 8 bytes (pointer to codeGenModules array)
        if idx + 16 <= len(data_slice):
            next_ptr = struct.unpack('<Q', data_slice[idx+8:idx+16])[0]
            if data_start <= next_ptr < data_start + data_len:
                print(f"Candidate codeGenModules: count={count} at {hex(abs_addr)}, array_ptr={hex(next_ptr)}")
                # Check array of pointers at next_ptr
                arr_off = next_ptr - data_start
                # Read 5 pointers
                sample = [struct.unpack('<Q', data_slice[arr_off+i*8:arr_off+i*8+8])[0] for i in range(min(5, count))]
                print(f"  Sample module pointers: {[hex(p) for p in sample]}")
                # Check first module struct
                mod0_ptr = sample[0]
                if data_start <= mod0_ptr < data_start + data_len:
                    mod0_off = mod0_ptr - data_start
                    # mod0 fields: name(8), m_cnt(4), m_ptrs(8)
                    m_name_ptr, m_cnt = struct.unpack('<QI', data_slice[mod0_off:mod0_off+12])
                    m_ptrs = struct.unpack('<Q', data_slice[mod0_off+16:mod0_off+24])[0]
                    print(f"  Module 0: name_ptr={hex(m_name_ptr)}, m_cnt={m_cnt}, m_ptrs={hex(m_ptrs)}")
        pos = idx + 8

