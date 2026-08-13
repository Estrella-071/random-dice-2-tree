import struct

# Let's locate the method pointers for QuantumUser simulation methods
# In IL2CPP, CodeRegistration contains methodPointers array.
# How do we find g_CodeRegistration in Mach-O?
# In 64-bit Mach-O:
# g_CodeRegistration has pointer to methodPointers, which has N pointers to code in __TEXT,__text.

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"

with open(framework_path, 'rb') as f:
    # Let's read Mach-O header
    header = f.read(32)
    magic, cputype, cpusubtype, filetype, ncmds, sizeofcmds, flags, reserved = struct.unpack('<IiiIIIII', header)
    print(f"Mach-O Magic: {hex(magic)}, CPU: {cputype}, cmds: {ncmds}, sizeofcmds: {sizeofcmds}")

