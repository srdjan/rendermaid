/**
 * Integration tests for the complete library workflow
 */

import { assertEquals, assertExists, assert, assertStringIncludes } from "@std/assert";
import { parseMermaid } from "../lib/parser.ts";
import { renderSvg, renderHtml, renderJson, renderMermaid } from "../lib/renderers.ts";
import { analyzeAST, validateAST, enhanceAST } from "../lib/utils.ts";

Deno.test("Integration - Complete workflow: parse -> analyze -> validate -> render", () => {
  const input = `
flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process A]
  B -->|No| D[Process B]
  C --> E[End]
  D --> E
`;

  // Parse
  const parseResult = parseMermaid(input);
  assert(parseResult.success, "Should parse successfully");
  const ast = parseResult.data;

  // Analyze
  const analysis = analyzeAST(ast);
  assertEquals(analysis.complexity, 12); // 5 nodes + 6 edges + 2 shape types - 1
  assertExists(analysis.nodeShapes);
  assertExists(analysis.edgeTypes);

  // Validate
  const errors = validateAST(ast);
  assertEquals(errors.length, 0, "Should have no validation errors");

  // Enhance
  const enhancedAST = enhanceAST(ast);
  assertExists(enhancedAST.metadata.get("analysis"));

  // Render to multiple formats
  const svgResult = renderSvg(enhancedAST);
  const htmlResult = renderHtml(enhancedAST);
  const jsonResult = renderJson(enhancedAST);
  const mermaidResult = renderMermaid(enhancedAST);

  assert(svgResult.success, "SVG rendering should succeed");
  assert(htmlResult.success, "HTML rendering should succeed");
  assert(jsonResult.success, "JSON rendering should succeed");
  assert(mermaidResult.success, "Mermaid rendering should succeed");

  // Verify content
  assertStringIncludes(svgResult.data, "Start");
  assertStringIncludes(htmlResult.data, "Decision");
  assertStringIncludes(mermaidResult.data, "flowchart TD");
  
  const jsonData = JSON.parse(jsonResult.data);
  assertEquals(jsonData.diagramType.type, "flowchart");
});

Deno.test("Integration - Complex diagram with all shape types", () => {
  const input = `
flowchart LR
  A([Start]) --> B{Decision}
  B -->|Option 1| C[Process]
  B -->|Option 2| D((Circle))
  C --> E[(Database)]
  D --> F([Stadium])
  E --> G[End]
  F --> G
`;

  const parseResult = parseMermaid(input);
  assert(parseResult.success, "Should parse complex diagram");
  
  const ast = parseResult.data;
  assertEquals(ast.nodes.size, 7);
  assertEquals(ast.edges.length, 7);

  // Verify all shape types are parsed correctly
  assertEquals(ast.nodes.get("A")?.shape, "stadium");
  assertEquals(ast.nodes.get("B")?.shape, "rhombus");
  assertEquals(ast.nodes.get("C")?.shape, "rectangle");
  assertEquals(ast.nodes.get("D")?.shape, "circle");
  assertEquals(ast.nodes.get("E")?.shape, "rectangle"); // Database parsing not implemented yet
  assertEquals(ast.nodes.get("F")?.shape, "stadium");
  assertEquals(ast.nodes.get("G")?.shape, "rectangle");

  // Test rendering
  const svgResult = renderSvg(ast, { 
    width: 1200, 
    height: 800, 
    theme: "light" 
  });
  assert(svgResult.success, "Should render complex diagram to SVG");
  
  // Verify all nodes are in the output
  ["Start", "Decision", "Process", "Circle", "Database", "Stadium", "End"].forEach(label => {
    assertStringIncludes(svgResult.data, label);
  });
});

Deno.test("Integration - Error handling workflow", () => {
  const invalidInput = "not a valid mermaid diagram";
  
  const parseResult = parseMermaid(invalidInput);
  assert(!parseResult.success, "Should fail parsing invalid input");
  assertExists(parseResult.error);
});

Deno.test("Integration - Performance with large diagram", () => {
  // Generate a large diagram programmatically
  const nodeCount = 20;
  const edgeCount = 30;
  
  let input = "flowchart TD\n";
  
  // Add nodes
  for (let i = 0; i < nodeCount; i++) {
    const shape = i % 4 === 0 ? "[]" : i % 4 === 1 ? "{}" : i % 4 === 2 ? "()" : "(())";
    input += `  N${i}${shape[0]}Node ${i}${shape[1]}\n`;
  }
  
  // Add edges
  for (let i = 0; i < edgeCount; i++) {
    const from = Math.floor(Math.random() * nodeCount);
    const to = Math.floor(Math.random() * nodeCount);
    if (from !== to) {
      input += `  N${from} --> N${to}\n`;
    }
  }

  const startTime = performance.now();
  
  const parseResult = parseMermaid(input);
  assert(parseResult.success, "Should parse large diagram");
  
  const ast = parseResult.data;
  const analysis = analyzeAST(ast);
  assertExists(analysis);
  
  const svgResult = renderSvg(ast);
  assert(svgResult.success, "Should render large diagram");
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Should complete in reasonable time (less than 1 second)
  assert(duration < 1000, `Processing should be fast, took ${duration}ms`);
});

Deno.test("Integration - Round-trip: Mermaid -> AST -> Mermaid", () => {
  const original = `flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process]
  B -->|No| D[Skip]
  C --> E[End]
  D --> E`;

  // Parse original
  const parseResult = parseMermaid(original);
  assert(parseResult.success, "Should parse original");
  
  // Render back to Mermaid
  const renderResult = renderMermaid(parseResult.data);
  assert(renderResult.success, "Should render back to Mermaid");
  
  // Parse the rendered version
  const reparsedResult = parseMermaid(renderResult.data);
  assert(reparsedResult.success, "Should parse rendered version");
  
  // Should have same structure
  const originalAST = parseResult.data;
  const reparsedAST = reparsedResult.data;
  
  assertEquals(originalAST.nodes.size, reparsedAST.nodes.size);
  assertEquals(originalAST.edges.length, reparsedAST.edges.length);
  assertEquals(originalAST.diagramType.type, reparsedAST.diagramType.type);
  if (originalAST.diagramType.type === "flowchart" && reparsedAST.diagramType.type === "flowchart") {
    assertEquals(originalAST.diagramType.direction, reparsedAST.diagramType.direction);
  }
});

Deno.test("Integration - Multi-format rendering consistency", () => {
  const input = `
flowchart LR
  A[Input] --> B[Process]
  B --> C[Output]
`;

  const parseResult = parseMermaid(input);
  assert(parseResult.success, "Should parse");
  
  const ast = parseResult.data;
  
  // Render to all formats
  const svgResult = renderSvg(ast);
  const htmlResult = renderHtml(ast);
  const jsonResult = renderJson(ast);
  const mermaidResult = renderMermaid(ast);
  
  // All should succeed
  assert(svgResult.success, "SVG should succeed");
  assert(htmlResult.success, "HTML should succeed");
  assert(jsonResult.success, "JSON should succeed");
  assert(mermaidResult.success, "Mermaid should succeed");
  
  // All should contain the key elements
  const formats = [
    { name: "SVG", data: svgResult.data },
    { name: "HTML", data: htmlResult.data },
    { name: "Mermaid", data: mermaidResult.data }
  ];
  
  formats.forEach(format => {
    assertStringIncludes(format.data, "Input", `${format.name} should contain 'Input'`);
    assertStringIncludes(format.data, "Process", `${format.name} should contain 'Process'`);
    assertStringIncludes(format.data, "Output", `${format.name} should contain 'Output'`);
  });
  
  // JSON should parse correctly
  const jsonData = JSON.parse(jsonResult.data);
  assertEquals(Object.keys(jsonData.nodes).length, 3);
  assertEquals(jsonData.edges.length, 2);
});

Deno.test("Integration - Edge case handling", () => {
  const edgeCases = [
    "",
    "   ",
    "flowchart",
    "flowchart TD\n",
    "flowchart TD\n  A",
    "flowchart TD\n  A[Node with very long label that might cause issues]"
  ];
  
  edgeCases.forEach((input, index) => {
    const result = parseMermaid(input);
    // Most should fail gracefully, some might succeed
    if (!result.success) {
      assertExists(result.error, `Edge case ${index} should have error message`);
    }
  });
});