import re

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
with open(metadata_path, 'rb') as f:
    data = f.read()

# Let's find all occurrences of 'Light' / 'Resonance' / 'AttackSpeed' in the metadata
# and dump their neighborhood of strings
terms = [b'LightBoardEffect', b'ApplyLight', b'Resonance', b'AttackSpeedUp', b'GetAttackInterval', b'GetAttackSpeed', b'CalcAttackInterval', b'CalcAttackSpeed']

for term in terms:
    print(f"=== Search for {term} ===")
    for m in re.finditer(term, data):
        start = max(0, m.start() - 200)
        end = min(len(data), m.end() + 200)
        context = data[start:end]
        # split by null bytes
        tokens = [t.decode('latin1', errors='ignore') for t in context.split(b'\x00') if len(t) > 0]
        print(f"Match at {m.start()}: {tokens}")
