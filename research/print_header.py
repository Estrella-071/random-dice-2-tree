import struct

metadata_path = r"Random Dice 2 1.0.0/Payload/RandomDice2.app/Data/Managed/Metadata/global-metadata.dat"

with open(metadata_path, 'rb') as f:
    data = f.read()

header = struct.unpack('<64I', data[:256])

field_names = [
    "sanity", "version",
    "stringLiteralsOffset", "stringLiteralsCount",
    "stringLiteralDataOffset", "stringLiteralDataCount",
    "stringOffset", "stringCount",
    "eventsOffset", "eventsCount",
    "propertiesOffset", "propertiesCount",
    "methodsOffset", "methodsCount",
    "parameterDefaultValuesOffset", "parameterDefaultValuesCount",
    "fieldDefaultValuesOffset", "fieldDefaultValuesCount",
    "fieldAndParameterDefaultValueDataOffset", "fieldAndParameterDefaultValueDataCount",
    "fieldMarshaledSizesOffset", "fieldMarshaledSizesCount",
    "parametersOffset", "parametersCount",
    "fieldsOffset", "fieldsCount",
    "genericParametersOffset", "genericParametersCount",
    "genericParameterConstraintsOffset", "genericParameterConstraintsCount",
    "genericContainersOffset", "genericContainersCount",
    "nestedTypesOffset", "nestedTypesCount",
    "interfacesOffset", "interfacesCount",
    "vtableMethodsOffset", "vtableMethodsCount",
    "interfaceOffsetsOffset", "interfaceOffsetsCount",
    "typeDefinitionsOffset", "typeDefinitionsCount",
    "imagesOffset", "imagesCount",
    "assembliesOffset", "assembliesCount",
    "fieldRefsOffset", "fieldRefsCount",
    "referencedAssembliesOffset", "referencedAssembliesCount",
    "attributeDataOffset", "attributeDataCount",
    "attributeDataRangeOffset", "attributeDataRangeCount",
    "unresolvedVirtualCallParameterTypesOffset", "unresolvedVirtualCallParameterTypesCount",
    "unresolvedVirtualCallParameterRangesOffset", "unresolvedVirtualCallParameterRangesCount",
    "windowsRuntimeTypeNamesOffset", "windowsRuntimeTypeNamesSize",
    "windowsRuntimeStringsOffset", "windowsRuntimeStringsSize",
    "exportedTypeDefinitionsOffset", "exportedTypeDefinitionsCount"
]

for i, val in enumerate(header[:len(field_names)]):
    print(f"{i:2d} {field_names[i]}: {val} (0x{val:X})")
