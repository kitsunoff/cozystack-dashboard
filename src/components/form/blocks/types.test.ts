import { describe, it, expect } from "vitest";
import { schemaHas, schemaProp, schemaEnum, schemaDefault, schemaAt } from "./types";

const MOCK_SCHEMA = {
  properties: {
    version: {
      type: "string",
      default: "v17",
      enum: ["v17", "v16", "v15", ""],
    },
    replicas: {
      type: "integer",
      default: 2,
    },
    kafka: {
      type: "object",
      properties: {
        replicas: { type: "integer", default: 3 },
        resourcesPreset: {
          type: "string",
          default: "small",
          enum: ["nano", "micro", "small", "medium"],
        },
      },
    },
  },
};

describe("schemaHas", () => {
  it("returns true for existing properties", () => {
    expect(schemaHas(MOCK_SCHEMA, "version")).toBe(true);
    expect(schemaHas(MOCK_SCHEMA, "replicas")).toBe(true);
  });

  it("returns false for missing properties", () => {
    expect(schemaHas(MOCK_SCHEMA, "backup")).toBe(false);
  });

  it("returns false for empty schema", () => {
    expect(schemaHas({}, "version")).toBe(false);
  });
});

describe("schemaProp", () => {
  it("returns property schema", () => {
    expect(schemaProp(MOCK_SCHEMA, "replicas")).toEqual({ type: "integer", default: 2 });
  });

  it("returns undefined for missing property", () => {
    expect(schemaProp(MOCK_SCHEMA, "nope")).toBeUndefined();
  });
});

describe("schemaEnum", () => {
  it("extracts enum values and filters empty strings", () => {
    expect(schemaEnum(MOCK_SCHEMA, "version")).toEqual(["v17", "v16", "v15"]);
  });

  it("returns undefined for non-enum property", () => {
    expect(schemaEnum(MOCK_SCHEMA, "replicas")).toBeUndefined();
  });

  it("returns undefined for missing property", () => {
    expect(schemaEnum(MOCK_SCHEMA, "nope")).toBeUndefined();
  });
});

describe("schemaDefault", () => {
  it("extracts default value", () => {
    expect(schemaDefault(MOCK_SCHEMA, "version")).toBe("v17");
    expect(schemaDefault(MOCK_SCHEMA, "replicas")).toBe(2);
  });

  it("returns undefined for missing property", () => {
    expect(schemaDefault(MOCK_SCHEMA, "nope")).toBeUndefined();
  });
});

describe("schemaAt", () => {
  it("navigates into nested schema", () => {
    const kafkaSchema = schemaAt(MOCK_SCHEMA, ["kafka"]);
    expect(schemaHas(kafkaSchema, "replicas")).toBe(true);
    expect(schemaDefault(kafkaSchema, "replicas")).toBe(3);
    expect(schemaEnum(kafkaSchema, "resourcesPreset")).toEqual([
      "nano", "micro", "small", "medium",
    ]);
  });

  it("returns empty schema for missing path", () => {
    const missing = schemaAt(MOCK_SCHEMA, ["nonexistent"]);
    expect(schemaHas(missing, "replicas")).toBe(false);
  });

  it("handles empty path (returns root)", () => {
    expect(schemaAt(MOCK_SCHEMA, [])).toBe(MOCK_SCHEMA);
  });

  it("navigates deep paths", () => {
    const deep = {
      properties: {
        a: {
          type: "object",
          properties: {
            b: {
              type: "object",
              properties: {
                c: { type: "string", default: "found" },
              },
            },
          },
        },
      },
    };
    const result = schemaAt(deep, ["a", "b"]);
    expect(schemaDefault(result, "c")).toBe("found");
  });
});
