import re

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    data = f.read()

# Find all occurrences of strings related to Quantum Simulation, Defender, Light, Resonance, AttackSpeed, Buff
pattern = re.compile(rb'([a-zA-Z0-9_\.]{3,}(?:Defender|Light|Resonance|Attack|Speed|Buff|Quantum|Skill|Board)[a-zA-Z0-9_\.]*)')
matches = set(pattern.findall(data))

decoded = []
for m in matches:
    try:
        s = m.decode('ascii')
        if any(k in s.lower() for k in ['light', 'resonance', 'attackspeed', 'attackinterval', 'skill', 'defender', 'buff', 'boardeffect']):
            decoded.append(s)
    except:
        pass

decoded.sort()
with open("research/quantum_matches.txt", "w", encoding="utf-8") as out:
    for s in decoded:
        out.write(s + "\n")

print(f"Total relevant tokens: {len(decoded)}")
