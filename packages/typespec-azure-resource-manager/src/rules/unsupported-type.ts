import { DiagnosticTarget, Type, createRule, isType, paramMessage } from "@typespec/compiler";

const UnsupportedIntrinsicModel = new Set(["int8", "int16", "uint8", "uint16", "uint32", "uint64"]);
/**
 * Validation related to versioning.
 */
export const unsupportedTypeRule = createRule({
  name: "unsupported-type",
  severity: "warning",
  description: "Check for unsupported ARM types.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/unsupported-type",
  messages: {
    default: paramMessage`Model type '${"typeName"}' is not supported in Azure resource manager APIs.`,
  },
  create(context) {
    return {
      modelProperty: (property) => {
        checkUnsupportedType(property.type, property);
      },
      operation: (op) => {
        checkUnsupportedType(op.returnType, op);
      },
    };

    function checkUnsupportedType(type: Type, target: DiagnosticTarget) {
      if (type.kind !== "Scalar" && type.kind !== "Model") {
        return;
      }
      if (type.kind === "Scalar") {
        if (UnsupportedIntrinsicModel.has(type.name)) {
          context.reportDiagnostic({
            format: { typeName: type.name },
            target,
          });
        }
      }
      if (type.templateMapper) {
        for (const templateArg of type.templateMapper.args) {
          if (isType(templateArg)) {
            checkUnsupportedType(templateArg, target);
          }
        }
      }
    }
  },
});
