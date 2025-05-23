import { ModelProperty, Type, createRule, paramMessage } from "@typespec/compiler";
import {
  getAddedOnVersions,
  getMadeOptionalOn,
  getRemovedOnVersions,
  getRenamedFromVersions,
} from "@typespec/versioning";

export const nonBreakingVersioningRule = createRule({
  name: "non-breaking-versioning",
  description: "Check that only backward compatible versioning change are done to a service.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/non-breaking-versioning",
  messages: {
    default: paramMessage`Using ${"action"} is not backward compatible.`,
    addedRequired: "Adding required property is a breaking change.",
    optionalNoDefault: "Property made optional should have a default value.",
  },
  create(context) {
    return {
      model: checkBadVersioningPattern,
      modelProperty: checkBadVersioningPatternForProperty,
      operation: checkBadVersioningPattern,
    };

    function checkBadVersioningPattern(type: Type) {
      if (getRemovedOnVersions(context.program, type) !== undefined) {
        reportBreakingVersioning("@removed", type);
      }
      if (getRenamedFromVersions(context.program, type) !== undefined) {
        reportBreakingVersioning("@renamedFrom", type);
      }
    }

    function checkBadVersioningPatternForProperty(modelProperty: ModelProperty) {
      checkBadVersioningPattern(modelProperty);

      if (
        getAddedOnVersions(context.program, modelProperty) !== undefined &&
        !modelProperty.optional
      ) {
        context.reportDiagnostic({
          messageId: "addedRequired",
          target: modelProperty,
        });
      }

      if (
        getMadeOptionalOn(context.program, modelProperty) !== undefined &&
        modelProperty.defaultValue === undefined
      ) {
        context.reportDiagnostic({
          messageId: "optionalNoDefault",
          target: modelProperty,
        });
      }
    }

    function reportBreakingVersioning(action: string, target: Type) {
      context.reportDiagnostic({
        format: { action },
        target,
      });
    }
  },
});
