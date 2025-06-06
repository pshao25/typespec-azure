import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { it } from "vitest";
import { canonicalVersion } from "../src/emitter.js";
import { diagnoseOpenApiFor, openApiFor } from "./test-host.js";

it("works with models", async () => {
  const v = await openApiFor(
    `
    @versioned(Versions)
    @service(#{title: "My Service"})
    namespace MyService {
      enum Versions {
        @useDependency(MyLibrary.Versions.A)
        v1: "2020-11-01-preview",
        @useDependency(MyLibrary.Versions.B)
        v2: "2021-05-01-preview",
        @useDependency(MyLibrary.Versions.C)
        v3: "2022-05-01-preview"
      }

      model Test {
        prop1: string;
        @added(Versions.v2) prop2: string;
        @removed(Versions.v2) prop3: string;
        @madeOptional(Versions.v3) prop5?: string;
      }

      @route("/read1")
      op read1(): Test;
      op read2(): MyLibrary.Foo;
    }

    @versioned(Versions)
    namespace MyLibrary {
      enum Versions {A, B, C}

      model Foo {
        prop1: string;
        @added(Versions.B) prop2: string;
        @added(Versions.C) prop3: string;
      }
    }
  `,
  );
  strictEqual(v.info.version, canonicalVersion);
  deepStrictEqual(v.info["x-canonical-included-versions"], [
    "2020-11-01-preview",
    "2021-05-01-preview",
    "2022-05-01-preview",
  ]);
  deepStrictEqual(v.definitions.Test, {
    type: "object",
    properties: {
      prop1: { type: "string" },
      prop2: { type: "string" },
      prop3: { type: "string" },
      prop5: { type: "string" },
    },
    required: ["prop1", "prop2", "prop3"],
  });

  deepStrictEqual(v.definitions["MyLibrary.Foo"], {
    type: "object",
    properties: {
      prop1: { type: "string" },
      prop2: { type: "string" },
      prop3: { type: "string" },
    },
    required: ["prop1", "prop2", "prop3"],
  });
});

it("Diagnostics for unsupported versioning decorators.", async () => {
  const diagnostics = await diagnoseOpenApiFor(
    `
    @versioned(Versions)
    @service(#{title: "My Service"})
    namespace MyService {
      enum Versions {
        @useDependency(MyLibrary.Versions.A)
        v1,
        @useDependency(MyLibrary.Versions.B)
        v2,
        @useDependency(MyLibrary.Versions.C)
        v3
      }

      model Test {
        prop1: string;
        @added(Versions.v2) prop2: string;
        @removed(Versions.v2) prop3: string;
        @renamedFrom(Versions.v3, "prop4") prop4new: string;
        @madeOptional(Versions.v3) prop5?: string;
        @typeChangedFrom(Versions.v2, int32) prop6: string;
      }

      @route("/read1")
      op read1(): Test;
      op read2(): MyLibrary.Foo;

      @route("/testReturnType") 
      @returnTypeChangedFrom(Versions.v2, int32) 
      op testReturnType(var: string): string; 
    }

    @versioned(Versions)
    namespace MyLibrary {
      enum Versions {A, B, C}

      model Foo {
        prop1: string;
        @added(Versions.B) prop2: string;
        @added(Versions.C) prop3: string;
      }
    }
  `,
  );
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-autorest-canonical/unsupported-versioning-decorator",
      message: "Decorator @renamedFrom is not supported in AutorestCanonical.",
    },
    {
      code: "@azure-tools/typespec-autorest-canonical/unsupported-versioning-decorator",
      message: "Decorator @typeChangedFrom is not supported in AutorestCanonical.",
    },
    {
      code: "@azure-tools/typespec-autorest-canonical/unsupported-versioning-decorator",
      message: "Decorator @returnTypeChangedFrom is not supported in AutorestCanonical.",
    },
  ]);
});

it("Get correct included versions when there is no value", async () => {
  const v = await openApiFor(
    `
    @versioned(Versions)
    @service(#{title: "My Service"})
    namespace MyService {
      enum Versions {
        @useDependency(MyLibrary.Versions.A)
        v1,
        @useDependency(MyLibrary.Versions.B)
        v2,
        @useDependency(MyLibrary.Versions.C)
        v3
      }

      model Test {
        prop1: string;
        @added(Versions.v2) prop2: string;
        @removed(Versions.v2) prop3: string;
        @madeOptional(Versions.v3) prop5?: string;
      }

      @route("/read1")
      op read1(): Test;
      op read2(): MyLibrary.Foo;
    }

    @versioned(Versions)
    namespace MyLibrary {
      enum Versions {A, B, C}

      model Foo {
        prop1: string;
        @added(Versions.B) prop2: string;
        @added(Versions.C) prop3: string;
      }
    }
  `,
  );
  strictEqual(v.info.version, canonicalVersion);
  deepStrictEqual(v.info["x-canonical-included-versions"], ["v1", "v2", "v3"]);
  deepStrictEqual(v.definitions.Test, {
    type: "object",
    properties: {
      prop1: { type: "string" },
      prop2: { type: "string" },
      prop3: { type: "string" },
      prop5: { type: "string" },
    },
    required: ["prop1", "prop2", "prop3"],
  });

  deepStrictEqual(v.definitions["MyLibrary.Foo"], {
    type: "object",
    properties: {
      prop1: { type: "string" },
      prop2: { type: "string" },
      prop3: { type: "string" },
    },
    required: ["prop1", "prop2", "prop3"],
  });
});
