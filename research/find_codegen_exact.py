import struct
import re

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"
framework_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Frameworks/UnityFramework.framework/UnityFramework"

with open(metadata_path, 'rb') as f:
    meta = f.read()

with open(framework_path, 'rb') as f:
    macho = f.read()

str_offset = 1257980
methods_off = 5541704

def get_str(idx):
    if idx < 0: return ""
    pos = str_offset + idx
    end = meta.find(b'\x00', pos)
    if end != -1:
        return meta[pos:end].decode('utf-8', errors='ignore')
    return ""

# Method index 117613 is ApplyLightBoardBuffs
# Method index 117047 is AddBoardEffect
# Method index 117046 is CheckBoardEffect
# Method index 117051 is UpdateBoardEffect
# Method index 117053 is GetBoardEffectList

# Let's find g_CodeRegistration in Mach-O
# g_CodeRegistration structure in 64-bit Unity 2022.3:
# struct Il2CppCodeRegistration {
#    uint64_t reversePInvokeWrapperCount;
#    uint64_t reversePInvokeWrappers;
#    uint64_t genericMethodPointersCount;
#    uint64_t genericMethodPointers;
#    uint64_t genericAdjustorThunks;
#    uint64_t invokerPointersCount;
#    uint64_t invokerPointers;
#    uint64_t customAttributeCount;
#    uint64_t customAttributeGenerators;
#    uint64_t unresolvedVirtualCallCount;
#    uint64_t unresolvedVirtualCallPointers;
#    uint64_t interopDataCount;
#    uint64_t interopData;
#    uint64_t windowsRuntimeFactoryCount;
#    uint64_t windowsRuntimeFactoryTable;
#    uint64_t codeGenModulesCount;
#    uint64_t codeGenModules;
# }

# Let's scan Mach-O for the codeGenModules array!
# We know there are 218 images/modules (from earlier count)
print(f"Searching for codeGenModules array of size around 218...")

# Each element in codeGenModules is a pointer to Il2CppCodeGenModule
# Il2CppCodeGenModule:
# 0: moduleName (ptr)
# 8: methodPointerCount (uint32)
# 16: methodPointers (ptr)
# ...
# Let's scan __DATA_CONST and __DATA for an array of ~218 pointers to valid structs

# First, find string pointer for "Quantum.Simulation.dll" or "Assembly-CSharp.dll"
# Let's find "Quantum.Simulation.dll" anywhere in macho or find pointers to it
for name in [b"Quantum.Simulation.dll", b"Assembly-CSharp.dll", b"Quantum.Engine.dll"]:
    pos = 0
    while True:
        idx = macho.find(name, pos)
        if idx == -1: break
        print(f"Found '{name.decode()}' at {hex(idx)}")
        # search for 64-bit pointers to this address
        ptr_val = struct.pack('<Q', idx)
        p_pos = 0
        while True:
            p_idx = macho.find(ptr_val, p_pos)
            if p_idx == -1: break
            print(f"  Pointer to '{name.decode()}' found at {hex(p_idx)}")
            # check if p_idx is a CodeGenModule
            # let's inspect next fields
            mod_name_ptr, m_cnt, m_ptrs = struct.unpack('<QQQ', macho[p_idx:p_idx+24])
            print(f"    struct at {hex(p_idx)}: name_ptr={hex(mod_name_ptr)}, m_cnt={m_cnt}, m_ptrs={hex(m_ptrs)}")
            p_pos = p_idx + 1
        pos = idx + 1

