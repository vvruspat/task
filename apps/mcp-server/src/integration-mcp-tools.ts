import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  IntegrationAgentToolDefinition,
  IntegrationAgentToolInputSchema,
  IntegrationAgentToolJsonScalar,
  IntegrationAgentToolJsonSchema,
  IntegrationAgentToolJsonType,
} from "@task/integration-sdk";
import * as z from "zod/v4";
import type {
  IntegrationMcpToolDefinitionResponse,
  TaskBackendIntegrationClient,
} from "./backend-client.js";
import type { TaskMcpIntegrationContext } from "./config.js";

const qualifiedToolNamePattern = /^[a-z][a-z0-9_]{0,63}$/u;
const schemaPropertyNamePattern = /^[A-Za-z][A-Za-z0-9_]{0,63}$/u;
const supportedStringFormats = new Set(["date-time", "uri", "uuid"]);
const maxIntegrationMcpTools = 100;
const maxSchemaProperties = 100;
const allowedSchemaKeys = new Set([
  "additionalProperties",
  "description",
  "enum",
  "format",
  "items",
  "maxItems",
  "maxLength",
  "maximum",
  "minItems",
  "minLength",
  "minimum",
  "properties",
  "required",
  "type",
]);
const jsonTypes: readonly IntegrationAgentToolJsonType[] = [
  "array",
  "boolean",
  "integer",
  "null",
  "number",
  "object",
  "string",
];

export function parseIntegrationMcpToolDefinitions(
  values: readonly IntegrationMcpToolDefinitionResponse[],
): readonly IntegrationAgentToolDefinition[] {
  if (values.length > maxIntegrationMcpTools) {
    throw new Error("Integration MCP tool list exceeds the supported limit.");
  }
  const names = new Set<string>();
  return values.map((value) => {
    if (!qualifiedToolNamePattern.test(value.name) || names.has(value.name)) {
      throw new Error(`Invalid or duplicate integration MCP tool name: ${value.name}`);
    }
    if (value.description.length === 0 || value.description.length > 1_000) {
      throw new Error(`Integration MCP tool ${value.name} has an invalid description.`);
    }
    const inputSchema = parseInputSchema(value.inputSchema);
    names.add(value.name);
    return {
      description: value.description,
      inputSchema,
      name: value.name,
      readOnly: true,
    };
  });
}

export function registerIntegrationMcpTools(
  server: McpServer,
  backendClient: Pick<TaskBackendIntegrationClient, "executeIntegrationMcpTool">,
  context: TaskMcpIntegrationContext,
  tools: readonly IntegrationAgentToolDefinition[],
): void {
  for (const tool of tools) {
    if (!tool.readOnly) {
      throw new Error(`MCP adapter cannot register mutating integration tool ${tool.name}.`);
    }
    server.registerTool(
      tool.name,
      {
        annotations: {
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
          readOnlyHint: true,
        },
        description: tool.description,
        inputSchema: toZodRawShape(tool.inputSchema),
        title: tool.name,
      },
      async (argumentsValue): Promise<CallToolResult> => {
        const execution = await backendClient.executeIntegrationMcpTool({
          body: { arguments: argumentsValue, name: tool.name },
          userId: context.userId,
          workspaceId: context.workspaceId,
        });
        if (execution.name !== tool.name) {
          throw new Error(
            `Backend returned an unexpected integration tool name ${execution.name}.`,
          );
        }
        return {
          content: [{ text: JSON.stringify(execution.result, null, 2), type: "text" }],
          structuredContent: execution.result,
        };
      },
    );
  }
}

export function toZodRawShape(schema: IntegrationAgentToolInputSchema): Record<string, z.ZodType> {
  const required = new Set(schema.required ?? []);
  return Object.fromEntries(
    Object.entries(schema.properties).map(([name, propertySchema]) => {
      const zodSchema = toZodSchema(propertySchema);
      return [name, required.has(name) ? zodSchema : zodSchema.optional()];
    }),
  );
}

function toZodSchema(schema: IntegrationAgentToolJsonSchema): z.ZodType {
  const types = Array.isArray(schema.type)
    ? schema.type
    : schema.type === undefined
      ? []
      : [schema.type];
  let result: z.ZodType | null = null;
  for (const type of types) {
    const candidate = toZodSchemaForType(type, schema);
    result = result === null ? candidate : result.or(candidate);
  }
  result ??= z.unknown();
  if (schema.enum !== undefined) {
    result = result.refine(
      (value) => schema.enum?.some((candidate) => Object.is(candidate, value)) === true,
      "Value is outside the declared enum.",
    );
  }
  return schema.description === undefined ? result : result.describe(schema.description);
}

function toZodSchemaForType(
  type: IntegrationAgentToolJsonType,
  schema: IntegrationAgentToolJsonSchema,
): z.ZodType {
  if (type === "string") {
    let value = z.string();
    if (schema.minLength !== undefined) value = value.min(schema.minLength);
    if (schema.maxLength !== undefined) value = value.max(schema.maxLength);
    if (schema.format === "uuid") value = value.uuid();
    if (schema.format === "date-time") value = value.datetime();
    if (schema.format === "uri") value = value.url();
    return value;
  }
  if (type === "number" || type === "integer") {
    let value = type === "integer" ? z.number().int() : z.number();
    if (schema.minimum !== undefined) value = value.min(schema.minimum);
    if (schema.maximum !== undefined) value = value.max(schema.maximum);
    return value;
  }
  if (type === "boolean") return z.boolean();
  if (type === "null") return z.null();
  if (type === "array") {
    let value = z.array(schema.items === undefined ? z.unknown() : toZodSchema(schema.items));
    if (schema.minItems !== undefined) value = value.min(schema.minItems);
    if (schema.maxItems !== undefined) value = value.max(schema.maxItems);
    return value;
  }
  const required = new Set(schema.required ?? []);
  const shape: Record<string, z.ZodType> = Object.fromEntries(
    Object.entries(schema.properties ?? {}).map(([name, propertySchema]) => {
      const value = toZodSchema(propertySchema);
      return [name, required.has(name) ? value : value.optional()];
    }),
  );
  return schema.additionalProperties === false
    ? z.object(shape).strict()
    : z.object(shape).passthrough();
}

function parseInputSchema(value: unknown): IntegrationAgentToolInputSchema {
  const schema = parseJsonSchema(value, 0);
  if (
    schema.type !== "object" ||
    schema.additionalProperties !== false ||
    schema.properties === undefined
  ) {
    throw new Error("Integration MCP tool input schema must be a closed object.");
  }
  const required = schema.required ?? [];
  if (
    new Set(required).size !== required.length ||
    required.some((name) => schema.properties?.[name] === undefined)
  ) {
    throw new Error("Integration MCP tool input schema has invalid required properties.");
  }
  return {
    ...schema,
    additionalProperties: false,
    properties: schema.properties,
    type: "object",
  };
}

function parseJsonSchema(value: unknown, depth: number): IntegrationAgentToolJsonSchema {
  if (depth > 12) throw new Error("Integration MCP tool schema is too deeply nested.");
  const record = readRecord(value, "integration MCP tool schema");
  if (Object.keys(record).some((key) => !allowedSchemaKeys.has(key))) {
    throw new Error("Integration MCP tool schema contains unsupported properties.");
  }
  const additionalProperties = readOptionalBoolean(record, "additionalProperties");
  const description = readOptionalString(record, "description");
  const format = readOptionalString(record, "format");
  if (format !== undefined && !supportedStringFormats.has(format)) {
    throw new Error(`Integration MCP tool schema format ${format} is unsupported.`);
  }
  const itemsValue = readProperty(record, "items");
  const propertiesValue = readProperty(record, "properties");
  const required = readOptionalStringArray(record, "required");
  const type = readOptionalJsonSchemaType(readProperty(record, "type"));
  const enumValues = readOptionalJsonScalarArray(readProperty(record, "enum"));
  const minItems = readOptionalNonNegativeInteger(record, "minItems");
  const maxItems = readOptionalNonNegativeInteger(record, "maxItems");
  const minLength = readOptionalNonNegativeInteger(record, "minLength");
  const maxLength = readOptionalNonNegativeInteger(record, "maxLength");
  const minimum = readOptionalFiniteNumber(record, "minimum");
  const maximum = readOptionalFiniteNumber(record, "maximum");
  if (
    (minItems !== undefined && maxItems !== undefined && minItems > maxItems) ||
    (minLength !== undefined && maxLength !== undefined && minLength > maxLength) ||
    (minimum !== undefined && maximum !== undefined && minimum > maximum)
  ) {
    throw new Error("Integration MCP tool schema contains inverted bounds.");
  }
  const propertyEntries =
    propertiesValue === undefined
      ? undefined
      : Object.entries(readRecord(propertiesValue, "integration MCP schema properties"));
  if (
    propertyEntries !== undefined &&
    (propertyEntries.length > maxSchemaProperties ||
      propertyEntries.some(([name]) => !schemaPropertyNamePattern.test(name)))
  ) {
    throw new Error("Integration MCP tool schema properties are invalid or exceed the limit.");
  }
  const properties =
    propertyEntries === undefined
      ? undefined
      : Object.fromEntries(
          propertyEntries.map(([name, property]) => [name, parseJsonSchema(property, depth + 1)]),
        );
  if (
    required !== undefined &&
    (properties === undefined ||
      new Set(required).size !== required.length ||
      required.some((name) => properties[name] === undefined))
  ) {
    throw new Error("Integration MCP tool schema has invalid required properties.");
  }
  return {
    ...(additionalProperties === undefined ? {} : { additionalProperties }),
    ...(description === undefined ? {} : { description }),
    ...(enumValues === undefined ? {} : { enum: enumValues }),
    ...(format === undefined ? {} : { format }),
    ...(itemsValue === undefined ? {} : { items: parseJsonSchema(itemsValue, depth + 1) }),
    ...(maxItems === undefined ? {} : { maxItems }),
    ...(maxLength === undefined ? {} : { maxLength }),
    ...(maximum === undefined ? {} : { maximum }),
    ...(minItems === undefined ? {} : { minItems }),
    ...(minLength === undefined ? {} : { minLength }),
    ...(minimum === undefined ? {} : { minimum }),
    ...(properties === undefined ? {} : { properties }),
    ...(required === undefined ? {} : { required }),
    ...(type === undefined ? {} : { type }),
  };
}

function readOptionalJsonSchemaType(
  value: unknown,
): IntegrationAgentToolJsonType | readonly IntegrationAgentToolJsonType[] | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return readJsonSchemaType(value);
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Integration MCP schema type must be a supported type or non-empty array.");
  }
  const types = value.map(readJsonSchemaType);
  if (new Set(types).size !== types.length) {
    throw new Error("Integration MCP schema types must be unique.");
  }
  return types;
}

function readJsonSchemaType(value: unknown): IntegrationAgentToolJsonType {
  if (!isIntegrationAgentToolJsonType(value)) {
    throw new Error("Integration MCP schema type is unsupported.");
  }
  return value;
}

function isIntegrationAgentToolJsonType(value: unknown): value is IntegrationAgentToolJsonType {
  return jsonTypes.some((candidate) => candidate === value);
}

function readOptionalJsonScalarArray(
  value: unknown,
): readonly IntegrationAgentToolJsonScalar[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || !value.every(isJsonScalar)) {
    throw new Error("Integration MCP schema enum must contain JSON scalar values.");
  }
  return value;
}

function isJsonScalar(value: unknown): value is IntegrationAgentToolJsonScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function readOptionalStringArray(
  record: Record<string, unknown>,
  key: string,
): readonly string[] | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Integration MCP schema ${key} must be a string array.`);
  }
  return value;
}

function readOptionalBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`Integration MCP schema ${key} must be a boolean.`);
  }
  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > 1_000) {
    throw new Error(`Integration MCP schema ${key} must be a bounded string.`);
  }
  return value;
}

function readOptionalNonNegativeInteger(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Integration MCP schema ${key} must be a non-negative integer.`);
  }
  return value;
}

function readOptionalFiniteNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Integration MCP schema ${key} must be a finite number.`);
  }
  return value;
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function readProperty(record: Record<string, unknown>, key: string): unknown {
  return record[key];
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
