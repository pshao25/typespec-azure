import { Operation, createRule } from "@typespec/compiler";
import { isBody, isBodyRoot } from "@typespec/http";

export const bodyArrayRule = createRule({
  name: "request-body-problem",
  description: "Request body should not be of raw array type.",
  severity: "warning",
  messages: {
    array:
      "Request body should not be of raw array type. Consider creating a container model that can add properties over time to avoid introducing breaking changes.",
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        for (const prop of op.parameters.properties.values()) {
          if (
            (isBody(context.program, prop) || isBodyRoot(context.program, prop)) &&
            prop.type.kind === "Model" &&
            prop.type.name === "Array"
          ) {
            context.reportDiagnostic({
              target: prop,
              messageId: "array",
            });
          }
        }
      },
    };
  },
});
