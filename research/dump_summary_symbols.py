import re

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    data = f.read()

# Let's extract all strings in the file that look like identifiers
tokens = re.findall(rb'[A-Za-z0-9_<>`\$\.]{3,}', data)
all_tokens = set()
for t in tokens:
    try:
        s = t.decode('ascii')
        all_tokens.add(s)
    except:
        pass

print(f"Total tokens found: {len(all_tokens)}")

# Filter categories
light_tokens = [s for s in all_tokens if 'light' in s.lower()]
reso_tokens = [s for s in all_tokens if 'resonance' in s.lower()]
speed_tokens = [s for s in all_tokens if 'attackspeed' in s.lower() or 'attackinterval' in s.lower()]
stat_tokens = [s for s in all_tokens if any(k in s.lower() for k in ['calcattack', 'getattackspeed', 'calcspeed', 'buff', 'boardeffect', 'statuseffect'])]

print(f"Light tokens: {len(light_tokens)}")
print(f"Resonance tokens: {len(reso_tokens)}")
print(f"Speed tokens: {len(speed_tokens)}")
print(f"Stat tokens: {len(stat_tokens)}")

with open("research/summary_symbols.txt", "w", encoding="utf-8") as out:
    out.write("=== LIGHT TOKENS ===\n")
    for s in sorted(light_tokens):
        out.write(s + "\n")
    out.write("\n=== RESONANCE TOKENS ===\n")
    for s in sorted(reso_tokens):
        out.write(s + "\n")
    out.write("\n=== SPEED TOKENS ===\n")
    for s in sorted(speed_tokens):
        out.write(s + "\n")
    out.write("\n=== STAT / BUFF TOKENS ===\n")
    for s in sorted(stat_tokens):
        out.write(s + "\n")

print("Saved research/summary_symbols.txt")
