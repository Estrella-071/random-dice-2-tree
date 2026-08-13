import struct

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
with open(framework_path, 'rb') as f:
    data = f.read(131072)

offset = 32
ncmds = struct.unpack('<I', data[16:20])[0]
for _ in range(ncmds):
    cmd, cmdsize = struct.unpack('<II', data[offset:offset+8])
    if cmd == 0x19: # LC_SEGMENT_64
        segname = data[offset+8:offset+24].split(b'\x00')[0].decode('ascii')
        vmaddr, vmsize, fileoff, filesize = struct.unpack('<QQQQ', data[offset+24:offset+56])
        print(f"Segment {segname:16s}: vmaddr={hex(vmaddr)}, fileoff={hex(fileoff)}, vmsize={hex(vmsize)}, filesize={hex(filesize)}")
    offset += cmdsize
