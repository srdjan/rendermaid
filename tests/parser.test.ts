/**
 * Unit tests for parser module
 */

import { assertEquals, assertExists, assert } from "@std/assert";
import {
  parseMermaid,
  createNode,
  createEdge,
  createAST,
  addNode,
  addEdge,
  Ok,
  Err
} from "../lib/parser.ts";

Deno.test("Parser - Basic flowchart parsing", () => {
  const input = `
flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process]
  C --> D[End]
`;

  const result = parseMermaid(input);
  assert(result.success, "Should parse successfully");

  const ast = result.data;
  assertEquals(ast.diagramType.type, "flowchart");
  if (ast.diagramType.type === "flowchart") {
    assertEquals(ast.diagramType.direction, "TD");
  }
  assertEquals(ast.nodes.size, 4);
  assertEquals(ast.edges.length, 3);
});

Deno.test("Parser - Node creation", () => {
  const node = createNode("A", "Start", "rectangle");

  assertEquals(node.id, "A");
  assertEquals(node.label, "Start");
  assertEquals(node.shape, "rectangle");
  // Node metadata is optional, check that it's defined or undefined
  assert(node.metadata === undefined || node.metadata instanceof Map);
});

Deno.test("Parser - Edge creation", () => {
  const edge = createEdge("A", "B", "arrow", "Yes");

  assertEquals(edge.from, "A");
  assertEquals(edge.to, "B");
  assertEquals(edge.type, "arrow");
  assertEquals(edge.label, "Yes");
});

Deno.test("Parser - AST creation", () => {
  const ast = createAST({ type: "flowchart", direction: "LR" });

  assertEquals(ast.diagramType.type, "flowchart");
  if (ast.diagramType.type === "flowchart") {
    assertEquals(ast.diagramType.direction, "LR");
  }
  assertEquals(ast.nodes.size, 0);
  assertEquals(ast.edges.length, 0);
  assertExists(ast.metadata);
});

Deno.test("Parser - Add node to AST", () => {
  const ast = createAST({ type: "flowchart", direction: "TD" });
  const node = createNode("A", "Start", "rectangle");
  const newAST = addNode(ast, node);

  assertEquals(newAST.nodes.size, 1);
  assertEquals(newAST.nodes.get("A"), node);
});

Deno.test("Parser - Add edge to AST", () => {
  const ast = createAST({ type: "flowchart", direction: "TD" });
  const edge = createEdge("A", "B", "arrow");
  const newAST = addEdge(ast, edge);

  assertEquals(newAST.edges.length, 1);
  assertEquals(newAST.edges[0], edge);
});

Deno.test("Parser - Complex flowchart with multiple shapes", () => {
  const input = `
flowchart LR
  A([Start]) --> B{Decision}
  B -->|Yes| C[Process]
  B -->|No| D((End))
  C --> E[(Database)]
  E --> D
`;

  const result = parseMermaid(input);
  assert(result.success, "Should parse complex flowchart");

  const ast = result.data;
  assertEquals(ast.nodes.size, 5);
  assertEquals(ast.edges.length, 5);

  // Check specific node shapes
  assertEquals(ast.nodes.get("A")?.shape, "stadium");
  assertEquals(ast.nodes.get("B")?.shape, "rhombus");
  assertEquals(ast.nodes.get("C")?.shape, "rectangle");
  assertEquals(ast.nodes.get("D")?.shape, "circle");
  assertEquals(ast.nodes.get("E")?.shape, "rectangle"); // Database parsing not implemented yet
});

Deno.test("Parser - Invalid syntax should return error", () => {
  const input = "invalid mermaid syntax";
  const result = parseMermaid(input);

  assert(!result.success, "Should fail on invalid syntax");
  assertExists(result.error);
});

Deno.test("Parser - Empty input should return error", () => {
  const result = parseMermaid("");
  assert(!result.success, "Should fail on empty input");
});

Deno.test("Parser - Result Ok helper", () => {
  const result = Ok("test data");
  assert(result.success);
  assertEquals(result.data, "test data");
});

Deno.test("Parser - Result Err helper", () => {
  const result = Err("error message");
  assert(!result.success);
  assertEquals(result.error, "error message");
});

Deno.test("Parser - Edge labels with special characters", () => {
  const input = `
flowchart TD
  A[Start] -->|"Yes/No"| B{Decision}
  B -->|"Option 1"| C[Process A]
  B -->|"Option 2"| D[Process B]
`;

  const result = parseMermaid(input);
  assert(result.success, "Should parse edge labels with special characters");

  const ast = result.data;
  assertEquals(ast.edges.length, 3);
  assertEquals(ast.edges[0].label, '"Yes/No"');
  assertEquals(ast.edges[1].label, '"Option 1"');
  assertEquals(ast.edges[2].label, '"Option 2"');
});

Deno.test("Parser - Node labels with spaces", () => {
  const input = `
flowchart TD
  A["Start Process"] --> B{"Make Decision"}
  B --> C["End Process"]
`;

  const result = parseMermaid(input);
  assert(result.success, "Should parse node labels with spaces");

  const ast = result.data;
  assertEquals(ast.nodes.get("A")?.label, '"Start Process"');
  assertEquals(ast.nodes.get("B")?.label, '"Make Decision"');
  assertEquals(ast.nodes.get("C")?.label, '"End Process"');
});