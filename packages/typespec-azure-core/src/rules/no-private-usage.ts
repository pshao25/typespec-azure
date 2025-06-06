import {
  createRule,
  DecoratedType,
  DiagnosticTarget,
  paramMessage,
  Type,
} from "@typespec/compiler";
import {
  checkDecoratorsInDisallowedNamespace,
  checkReferenceInDisallowedNamespace,
} from "./utils.js";

export const noPrivateUsage = createRule({
  name: "no-private-usage",
  description: "Verify that elements inside Private namespace are not referenced.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-private-usage",
  messages: {
    default: paramMessage`Referencing elements inside Private namespace "${"ns"}" is not allowed.`,
  },
  create(context) {
    function checkReference(origin: Type, type: Type, target: DiagnosticTarget) {
      return checkReferenceInDisallowedNamespace(context, origin, type, target, "Private");
    }

    function checkDecorators(type: Type & DecoratedType) {
      return checkDecoratorsInDisallowedNamespace(context, type, "Private");
    }
    return {
      model: (model) => {
        checkDecorators(model);
        model.baseModel && checkReference(model, model.baseModel, model);
      },
      modelProperty: (prop) => {
        checkDecorators(prop);
        checkReference(prop, prop.type, prop);
      },
      unionVariant: (variant) => {
        checkDecorators(variant);
        checkReference(variant, variant.type, variant);
      },
      operation: (type) => {
        checkDecorators(type);
      },
      interface: (type) => {
        checkDecorators(type);
      },
      enum: (type) => {
        checkDecorators(type);
      },
      union: (type) => {
        checkDecorators(type);
      },
    };
  },
});
