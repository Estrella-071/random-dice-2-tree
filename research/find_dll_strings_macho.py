import re

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
with open(framework_path, 'rb') as f:
    macho = f.read()

# find all occurrences of .dll in macho
matches = [m.start() for m in re.finditer(rb'[A-Za-z0-9_\.]+\.dll\x00', macho)]
print(f"Found {len(matches)} .dll strings in Mach-O:")
for off in matches:
    end = macho.find(b'\x00', off)
    print(f"  {hex(off)}: {macho[off:end].decode('latin1')}")
