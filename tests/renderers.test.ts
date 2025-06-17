/**
 * Unit tests for renderers module
 */

import { assertEquals, assertExists, assert, assertStringIncludes } from "@std/assert";
import { 
  renderSvg,
  renderHtml,
  renderJson,
  renderMermaid,
  render,
  svgRenderer,
  htmlRenderer,
  jsonRenderer,
  mermaidRenderer
} from "../lib/renderers.ts";
import { parseMermaid, createAST, createNode, createEdge, addNode, addEdge } from "../lib/parser.ts";

// Helper function to create test AST
function createTestAST() {
  let ast = createAST({ type: "flowchart", direction: "TD" });
  const nodeA = createNode("A", "Start", "rectangle");
  const nodeB = createNode("B", "End", "rectangle");
  const edge = createEdge("A", "B", "arrow");
  
  ast = addNode(ast, nodeA);
  ast = addNode(ast, nodeB);
  ast = addEdge(ast, edge);
  
  return ast;
}

Deno.test("Renderers - SVG renderer basic functionality", () => {
  const ast = createTestAST();
  const result = renderSvg(ast);
  
  assert(result.success, "SVG rendering should succeed");
  assertStringIncludes(result.data, "<svg");
  assertStringIncludes(result.data, "</svg>");
  assertStringIncludes(result.data, "Start");
  assertStringIncludes(result.data, "End");
});

Deno.test("Renderers - SVG renderer with custom config", () => {
  const ast = createTestAST();
  const result = renderSvg(ast, {
    width: 1000,
    height: 800,
    theme: "dark",
    nodeSpacing: 200
  });
  
  assert(result.success, "SVG rendering with config should succeed");
  assertStringIncludes(result.data, 'width="1000"');
  assertStringIncludes(result.data, 'height="800"');
});

Deno.test("Renderers - HTML renderer basic functionality", () => {
  const ast = createTestAST();
  const result = renderHtml(ast);
  
  assert(result.success, "HTML rendering should succeed");
  assertStringIncludes(result.data, "<div");
  assertStringIncludes(result.data, "Start");
  assertStringIncludes(result.data, "End");
});

Deno.test("Renderers - HTML renderer with styles", () => {
  const ast = createTestAST();
  const result = renderHtml(ast, {
    includeStyles: true,
    responsive: true
  });
  
  assert(result.success, "HTML rendering with styles should succeed");
  assertStringIncludes(result.data, "<style>");
});

Deno.test("Renderers - JSON renderer basic functionality", () => {
  const ast = createTestAST();
  const result = renderJson(ast);
  
  assert(result.success, "JSON rendering should succeed");
  
  const parsed = JSON.parse(result.data);
  assertEquals(parsed.diagramType.type, "flowchart");
  assertEquals(parsed.diagramType.direction, "TD");
  assertExists(parsed.nodes);
  assertExists(parsed.edges);
});

Deno.test("Renderers - JSON renderer pretty format", () => {
  const ast = createTestAST();
  const result = renderJson(ast, {
    pretty: true,
    includeMetadata: true
  });
  
  assert(result.success, "Pretty JSON rendering should succeed");
  assertStringIncludes(result.data, "\n");
  assertStringIncludes(result.data, "  ");
});

Deno.test("Renderers - Mermaid renderer basic functionality", () => {
  const ast = createTestAST();
  const result = renderMermaid(ast);
  
  assert(result.success, "Mermaid rendering should succeed");
  assertStringIncludes(result.data, "flowchart TD");
  assertStringIncludes(result.data, "A[Start]");
  assertStringIncludes(result.data, "B[End]");
  assertStringIncludes(result.data, "A --> B");
});

Deno.test("Renderers - Generic render function with SVG", () => {
  const ast = createTestAST();
  const result = render(ast, {
    type: "svg",
    config: { width: 800, height: 600, theme: "light", nodeSpacing: 100 }
  });
  
  assert(result.success, "Generic render should work with SVG");
  assertStringIncludes(result.data, "<svg");
});

Deno.test("Renderers - Generic render function with HTML", () => {
  const ast = createTestAST();
  const result = render(ast, {
    type: "html",
    config: { includeStyles: false, responsive: false }
  });
  
  assert(result.success, "Generic render should work with HTML");
  assertStringIncludes(result.data, "<div");
});

Deno.test("Renderers - Generic render function with JSON", () => {
  const ast = createTestAST();
  const result = render(ast, {
    type: "json",
    config: { pretty: false, includeMetadata: false }
  });
  
  assert(result.success, "Generic render should work with JSON");
  
  const parsed = JSON.parse(result.data);
  assertEquals(parsed.diagramType.type, "flowchart");
});

Deno.test("Renderers - Generic render function with Mermaid", () => {
  const ast = createTestAST();
  const result = render(ast, {
    type: "mermaid",
    config: { preserveFormatting: true, includeComments: false }
  });
  
  assert(result.success, "Generic render should work with Mermaid");
  assertStringIncludes(result.data, "flowchart TD");
});

Deno.test("Renderers - SVG renderer direct usage", () => {
  const ast = createTestAST();
  const result = svgRenderer(ast, {
    width: 600,
    height: 400,
    theme: "light",
    nodeSpacing: 100
  });
  
  assert(result.success, "Direct SVG renderer should work");
  assertStringIncludes(result.data, "<svg");
});

Deno.test("Renderers - Complex diagram rendering", () => {
  const input = `
flowchart LR
  A([Start]) --> B{Decision}
  B -->|Yes| C[Process A]
  B -->|No| D[Process B]
  C --> E((End))
  D --> E
`;

  const parseResult = parseMermaid(input);
  assert(parseResult.success, "Should parse complex diagram");
  
  const svgResult = renderSvg(parseResult.data);
  assert(svgResult.success, "Should render complex diagram to SVG");
  
  assertStringIncludes(svgResult.data, "Start");
  assertStringIncludes(svgResult.data, "Decision");
  assertStringIncludes(svgResult.data, "Process A");
  assertStringIncludes(svgResult.data, "Process B");
  assertStringIncludes(svgResult.data, "End");
});

Deno.test("Renderers - Error handling with invalid AST", () => {
  const invalidAST = {
    diagramType: { type: "flowchart", direction: "TD" } as const,
    nodes: new Map(),
    edges: [{
      from: "A",
      to: "B", 
      type: "arrow" as const,
      label: ""
    }],
    metadata: new Map()
  };
  
  const result = renderSvg(invalidAST);
  // Should still render but may have visual issues
  assert(result.success, "Should handle invalid AST gracefully");
});

Deno.test("Renderers - Theme variations", () => {
  const ast = createTestAST();
  
  const lightResult = renderSvg(ast, { theme: "light" });
  const darkResult = renderSvg(ast, { theme: "dark" });
  const neutralResult = renderSvg(ast, { theme: "neutral" });
  
  assert(lightResult.success, "Light theme should work");
  assert(darkResult.success, "Dark theme should work");
  assert(neutralResult.success, "Neutral theme should work");
  
  // Results should be different
  assert(lightResult.data !== darkResult.data, "Themes should produce different output");
});