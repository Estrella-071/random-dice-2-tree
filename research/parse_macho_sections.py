import struct

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"

with open(framework_path, 'rb') as f:
    data = f.read(131072) # first 128KB contains load commands

magic, cputype, cpusubtype, filetype, ncmds, sizeofcmds, flags, reserved = struct.unpack('<IiiIIIII', data[:32])

offset = 32
sections = []
for _ in range(ncmds):
    cmd, cmdsize = struct.unpack('<II', data[offset:offset+8])
    if cmd == 0x19: # LC_SEGMENT_64
        segname = data[offset+8:offset+24].split(b'\x00')[0].decode('ascii')
        vmaddr, vmsize, fileoff, filesize, maxprot, initprot, nsects, flags = struct.unpack('<QQQQiiII', data[offset+24:offset+72])
        # print(f"Segment: {segname}, vmaddr={hex(vmaddr)}, fileoff={hex(fileoff)}, nsects={nsects}")
        sect_offset = offset + 72
        for s in range(nsects):
            s_name = data[sect_offset:sect_offset+16].split(b'\x00')[0].decode('ascii')
            s_seg = data[sect_offset+16:sect_offset+32].split(b'\x00')[0].decode('ascii')
            s_addr, s_size, s_off = struct.unpack('<QQI', data[sect_offset+32:sect_offset+52])
            sections.append((s_seg, s_name, s_addr, s_size, s_off))
            sect_offset += 80
    offset += cmdsize

print(f"Total sections: {len(sections)}")
for seg, name, addr, size, off in sections:
    if any(k in name for k in ['text', 'const', 'data', 'bss', 'cstring']):
        print(f"  {seg},{name}: addr={hex(addr)}, size={hex(size)}, fileoff={hex(off)}")
