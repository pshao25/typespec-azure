import {
  CallableMessage,
  DecoratedType,
  DiagnosticTarget,
  Enum,
  EnumMember,
  getLocationContext,
  getNamespaceFullName,
  getTypeName,
  Interface,
  isTemplateDeclaration,
  LinterRuleContext,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Program,
  Scalar,
  SourceLocation,
  Type,
  Union,
  UnionVariant,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";

type DeclarableType =
  | Namespace
  | Model
  | ModelProperty
  | Enum
  | EnumMember
  | Union
  | UnionVariant
  | Scalar
  | Operation
  | Interface;

/**
 * Returns the full namespace name for the given type, if available.
 * @param program the TypeSpec program
 * @param type the type to query
 * @returns The name of the namespace the type belongs in.
 */
export function getNamespaceName(program: Program, type: DeclarableType | undefined): string {
  if (type === undefined) return "";
  if (type.kind === "ModelProperty") return type.model ? getNamespaceName(program, type.model) : "";
  if (type.kind === "EnumMember") return type.enum ? getNamespaceName(program, type.enum) : "";
  if (type.kind === "UnionVariant") return type.union ? getNamespaceName(program, type.union) : "";
  if (type.kind !== "Namespace") type = type.namespace;
  if (type === undefined) {
    return "";
  }
  return getNamespaceFullName(type);
}

/**
 * Returns true if the type is defined in a namespace that is excluded from linting.
 * @param program the TypeSpec program
 * @param type the type to query
 * @returns true if the type is defined in a namespace that is excluded from linting.
 */
export function isExcludedCoreType(program: Program, type: DeclarableType): boolean {
  // Don't enforce documentation on core libraries. They contain
  // developer-facing building blocks that do not need API-consumer-oriented
  // documentation using `@doc`.
  //
  // This is a stop-gap and we probably need a more general mechanism to
  // prevent linters from reporting issues on imported library code outside
  // the linter-user's control.
  //
  // https://github.com/Azure/typespec-azure/issues/801#issuecomment-1194454247
  //
  const nsName = getNamespaceName(program, type);
  const allowedNamespaces = ["TypeSpec", "Azure.Core", "Azure.ResourceManager", "OpenAPI"];
  return allowedNamespaces.find((allowed) => nsName.startsWith(allowed)) !== undefined;
}

export function isAzureSubNamespace(program: Program, ns: Namespace | undefined): boolean {
  if (!ns) return false;
  const nsName = getNamespaceName(program, ns);
  return nsName.startsWith("Azure.");
}

/**
 * Returns true if the model type is inline (has no name).
 * @param target the target model
 * @returns true if the model type is inline (has no name).
 */
export function isInlineModel(target: Model) {
  return !target.name;
}

/**
 * Returns true if the model type is a model with template declaration.
 * @param target the target model
 * @returns true if the model type is a model with template declaration.
 */
export function isTemplateDeclarationType(target: Model) {
  return target.node?.kind === SyntaxKind.ModelStatement && target.node.templateParameters.length;
}

/**
 * Returns true if the operation is defined on a templated interface which hasn't had args filled in
 * @param target the target operation
 * @returns true if the operation is defined on a templated interface which hasn't had args filled in
 */
export function isTemplatedInterfaceOperation(target: Operation) {
  return (
    target.node?.kind === SyntaxKind.OperationStatement &&
    target.interface &&
    isTemplateDeclaration(target.interface)
  );
}

/**
 * Returns true if the operation is an uninstantiated signature template
 * @param target the target operation
 * @returns true if the operation is an uninstantiated signature template
 */
export function isTemplatedOperationSignature(target: Operation) {
  return target.node?.kind === SyntaxKind.OperationStatement && isTemplateDeclaration(target);
}

/**
 * Checks whether a given name is in PascalCase
 * @param name the name to check
 * @returns true if the name is in PascalCase
 */
export function isPascalCaseNoAcronyms(name: string): boolean {
  if (name === undefined || name === null || name === "") return true;
  return /^([A-Z][a-z0-9]+)*[A-Z]?$/.test(name);
}

export function isPascalCaseWithAcceptedAcronyms(
  name: string,
  acceptedAcronyms: string[],
): boolean {
  if (isPascalCaseNoAcronyms(name)) {
    return true;
  }

  const acceptedAcronymsRegex = new RegExp(
    `^([A-Z][a-z0-9]*)*(${acceptedAcronyms.join("|")})([A-Z][a-z0-9]*)?$`,
  );
  return acceptedAcronymsRegex.test(name);
}

/**
 * Checks whether a given name is in camelCase
 * @param name the name to check
 * @returns true if the name is in camelCase
 */
export function isCamelCaseNoAcronyms(name: string): boolean {
  if (name === undefined || name === null || name === "") return true;
  return /^[^a-zA-Z0-9]?[a-z][a-z0-9]*([A-Z][a-z0-9]+)*[A-Z]?$/.test(name);
}

export function findLineStartAndIndent(location: SourceLocation): {
  lineStart: number;
  indent: string;
} {
  const text = location.file.text;
  let pos = location.pos;
  let indent = 0;
  while (pos > 0 && text[pos - 1] !== "\n") {
    if ([" ", "\t", "\n"].includes(text[pos - 1])) {
      indent++;
    } else {
      indent = 0;
    }
    pos--;
  }
  return { lineStart: pos, indent: location.file.text.slice(pos, pos + indent) };
}

export function checkReferenceInDisallowedNamespace(
  context: LinterRuleContext<{ readonly default: CallableMessage<["ns"]> }>,
  origin: Type,
  type: Type,
  target: DiagnosticTarget,
  disallowedNamespace: "Private" | "Legacy",
) {
  if (getLocationContext(context.program, origin).type !== "project") {
    return;
  }
  if (getLocationContext(context.program, type).type === "project") {
    return;
  }
  if (isInDisallowedNamespace(type, disallowedNamespace)) {
    context.reportDiagnostic({
      target,
      format: { ns: getTypeName(type.namespace) },
    });
  }
}

export function checkDecoratorsInDisallowedNamespace(
  context: LinterRuleContext<{ readonly default: CallableMessage<["ns"]> }>,
  type: Type & DecoratedType,
  disallowedNamespace: "Private" | "Legacy",
) {
  if (getLocationContext(context.program, type).type !== "project") {
    return;
  }
  for (const decorator of type.decorators) {
    if (
      decorator.definition &&
      isInDisallowedNamespace(decorator.definition, disallowedNamespace) &&
      getLocationContext(context.program, decorator.definition).type !== "project"
    ) {
      context.reportDiagnostic({
        target: decorator.node ?? type,
        format: { ns: getTypeName(decorator.definition.namespace) },
      });
    }
  }
}

function isInDisallowedNamespace(
  type: Type,
  disallowedNamespace: "Private" | "Legacy",
): type is Type & { namespace: Namespace } {
  if (!("namespace" in type)) {
    return false;
  }
  let current = type;
  while (current.namespace) {
    if (current.namespace?.name === disallowedNamespace) {
      return true;
    }
    current = current.namespace;
  }
  return false;
}
