import struct
import re

framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"
with open(framework_path, 'rb') as f:
    # Read binary in chunks or memory map
    macho_data = f.read()

print(f"Loaded UnityFramework, size = {len(macho_data)} bytes")

# Let's search for functions containing GetAttackIntervalByRatio, ApplyLightBoardBuffs, PlayerComp_Resonance, CountSameLevelResonanceDice
targets = [
    b"GetAttackIntervalByRatio",
    b"GetFinalAttackIntervalWithRuneEffect",
    b"ApplyLightBoardBuffs",
    b"ApplyLightDefenderRuneEffect",
    b"AccumulateResonanceFromBoard",
    b"UpdateResonanceBuff",
    b"CountSameLevelResonanceDice",
    b"LightBoardEffect",
    b"AttackSpeedUpAllSkill"
]

for t in targets:
    matches = [m.start() for m in re.finditer(re.escape(t), macho_data)]
    print(f"Target {t.decode('ascii')}: found at offsets {[hex(x) for x in matches]}")
