import { createRule, isRecordModelType, Model } from "@typespec/compiler";

export const noEmptyModel = createRule({
  name: "no-empty-model",
  severity: "warning",
  description:
    "ARM Properties with type:object that don't reference a model definition are not allowed. ARM doesn't allow generic type definitions as this leads to bad customer experience.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-empty-model",
  messages: {
    default: "Properties with type:object must have definition of a reference model.",
    extends:
      "The `type:object` model is not defined in the payload. Define the reference model of the object or change the `type` to a primitive data type like string, int, etc",
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (model.properties.size === 0 && !isRecordModelType(context.program, model)) {
          context.reportDiagnostic({
            code: "no-empty-model",
            target: model,
          });
        }
      },
    };
  },
});
