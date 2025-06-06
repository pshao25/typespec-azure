import { createRule, getNamespaceFullName, Interface } from "@typespec/compiler";

export const armLegacyOperationsDiscourage = createRule({
  name: "arm-legacy-operations-discourage",
  severity: "warning",
  description: "Verify the usage of LegacyOperations interface.",
  messages: {
    default: `Avoid using the LegacyOperations interface unless migrating a brownfield service.`,
  },
  create(context) {
    return {
      interface: (iFace: Interface) => {
        if (
          iFace.sourceInterfaces.length > 0 &&
          iFace.sourceInterfaces.some(
            (i) =>
              i.name === "LegacyOperations" &&
              i.namespace &&
              getNamespaceFullName(i.namespace) === "Azure.ResourceManager.Legacy",
          )
        ) {
          context.reportDiagnostic({
            code: "arm-legacy-operations-discourage",
            target: iFace,
          });
        }
      },
    };
  },
});
