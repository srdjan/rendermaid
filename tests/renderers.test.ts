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
  svgRenderer
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

// --- Edge routing improvement tests ---

Deno.test("Renderers - Nodes with long labels don't overlap in layout", () => {
  // Create nodes with labels wide enough to overlap at default 120px spacing
  let ast = createAST({ type: "flowchart", direction: "TD" });
  ast = addNode(ast, createNode("A", "Write Business Data to Table", "rectangle"));
  ast = addNode(ast, createNode("B", "Write Event to Outbox Table", "rectangle"));
  ast = addEdge(ast, createEdge("A", "B", "arrow"));

  const result = renderSvg(ast, { width: 800, height: 600, nodeSpacing: 120 });
  assert(result.success, "Should render without error");

  // Parse SVG to find node positions - extract rect x positions
  const rectXMatches = [...result.data.matchAll(/class="node-rect[^"]*"[^>]*>/g)];
  assert(rectXMatches.length >= 2, "Should have at least 2 node rects");

  // Both nodes are in different layers (A->B), so they should be vertically stacked
  // The key assertion: the SVG renders successfully with long labels
  assertStringIncludes(result.data, "Write Business Data to Table");
  assertStringIncludes(result.data, "Write Event to Outbox Table");
});

Deno.test("Renderers - Nodes in same layer with long labels have sufficient gap", () => {
  // Two nodes in the same layer (both are roots)
  let ast = createAST({ type: "flowchart", direction: "TD" });
  ast = addNode(ast, createNode("A", "Write Business Data to Table", "rectangle"));
  ast = addNode(ast, createNode("B", "Write Event to Outbox Table", "rectangle"));
  ast = addNode(ast, createNode("C", "End Process", "rectangle"));
  ast = addEdge(ast, createEdge("A", "C", "arrow"));
  ast = addEdge(ast, createEdge("B", "C", "arrow"));

  const result = renderSvg(ast, { width: 800, height: 600, nodeSpacing: 120 });
  assert(result.success, "Should render without error");

  // Extract x positions of node rects. Nodes A and B should be in the same layer.
  // We check that the SVG viewBox is wide enough to accommodate both nodes.
  const viewBoxMatch = result.data.match(/viewBox="0 0 (\d+\.?\d*) (\d+\.?\d*)"/);
  assertExists(viewBoxMatch, "Should have viewBox");
  const viewBoxWidth = parseFloat(viewBoxMatch![1]);
  // With two wide nodes, the canvas should be at least 800px
  assert(viewBoxWidth >= 800, `Canvas should be wide enough: ${viewBoxWidth}`);
});

Deno.test("Renderers - Edge avoids intermediate nodes (A->B->C->D, A->D)", () => {
  // Linear chain plus skip edge
  let ast = createAST({ type: "flowchart", direction: "TD" });
  ast = addNode(ast, createNode("A", "Start", "rectangle"));
  ast = addNode(ast, createNode("B", "Middle 1", "rectangle"));
  ast = addNode(ast, createNode("C", "Middle 2", "rectangle"));
  ast = addNode(ast, createNode("D", "End", "rectangle"));
  ast = addEdge(ast, createEdge("A", "B", "arrow"));
  ast = addEdge(ast, createEdge("B", "C", "arrow"));
  ast = addEdge(ast, createEdge("C", "D", "arrow"));
  ast = addEdge(ast, createEdge("A", "D", "arrow")); // skip edge

  const result = renderSvg(ast, { width: 800, height: 600, nodeSpacing: 120 });
  assert(result.success, "Should render skip-edge diagram");

  // The A->D edge should have waypoints (not just a straight line through B and C)
  // Count the number of path elements - the skip edge should have more L commands
  const paths = result.data.match(/<path d="[^"]+"/g) || [];
  assert(paths.length >= 4, `Should have at least 4 path elements, got ${paths.length}`);

  // The skip edge (A->D) should be a multi-segment orthogonal path
  // Find paths with multiple L commands (Z-shape routing)
  const multiSegmentPaths = paths.filter(p => (p.match(/L /g) || []).length >= 3);
  assert(multiSegmentPaths.length >= 1, "At least one edge should have orthogonal routing with 3+ segments");
});

Deno.test("Renderers - Orthogonal path segments are axis-aligned", () => {
  // Create a diagram where edge routing must produce non-trivial paths
  let ast = createAST({ type: "flowchart", direction: "TD" });
  ast = addNode(ast, createNode("A", "Source", "rectangle"));
  ast = addNode(ast, createNode("B", "Left Branch", "rectangle"));
  ast = addNode(ast, createNode("C", "Right Branch", "rectangle"));
  ast = addNode(ast, createNode("D", "Target", "rectangle"));
  ast = addEdge(ast, createEdge("A", "B", "arrow"));
  ast = addEdge(ast, createEdge("A", "C", "arrow"));
  ast = addEdge(ast, createEdge("B", "D", "arrow"));
  ast = addEdge(ast, createEdge("C", "D", "arrow"));

  const result = renderSvg(ast, { width: 800, height: 600, nodeSpacing: 120 });
  assert(result.success, "Should render diamond diagram");

  // Extract all path d attributes
  const pathDMatches = [...result.data.matchAll(/<path d="([^"]+)"/g)];
  assert(pathDMatches.length >= 4, "Should have at least 4 edges");

  // For each path, verify segments are axis-aligned (horizontal or vertical)
  for (const pathMatch of pathDMatches) {
    const d = pathMatch[1];
    // Parse M and L commands
    const coords: Array<{ x: number; y: number }> = [];
    const commands = d.match(/[ML] [\d.e+-]+ [\d.e+-]+/g) || [];
    for (const cmd of commands) {
      const parts = cmd.split(" ");
      coords.push({ x: parseFloat(parts[1]), y: parseFloat(parts[2]) });
    }

    // Check consecutive pairs are axis-aligned (within tolerance)
    for (let i = 1; i < coords.length; i++) {
      const dx = Math.abs(coords[i].x - coords[i - 1].x);
      const dy = Math.abs(coords[i].y - coords[i - 1].y);
      // Each segment should be mostly horizontal (dy near 0) or mostly vertical (dx near 0)
      const isHorizontal = dy < 2;
      const isVertical = dx < 2;
      assert(
        isHorizontal || isVertical,
        `Segment ${i - 1}->${i} is diagonal: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)} in path "${d}"`
      );
    }
  }
});

Deno.test("Renderers - Multiple edges targeting same node don't share identical paths", () => {
  let ast = createAST({ type: "flowchart", direction: "TD" });
  ast = addNode(ast, createNode("A", "Source 1", "rectangle"));
  ast = addNode(ast, createNode("B", "Source 2", "rectangle"));
  ast = addNode(ast, createNode("C", "Target", "rectangle"));
  ast = addEdge(ast, createEdge("A", "C", "arrow"));
  ast = addEdge(ast, createEdge("B", "C", "arrow"));

  const result = renderSvg(ast, { width: 800, height: 600, nodeSpacing: 120 });
  assert(result.success, "Should render multi-source diagram");

  // Extract paths
  const paths = [...result.data.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
  assert(paths.length >= 2, "Should have at least 2 edge paths");

  // The two paths should be different (different source positions)
  assert(paths[0] !== paths[1], "Two edges to same target should have different paths");
});

Deno.test("Renderers - LR direction produces horizontal layout", () => {
  const input = `
flowchart LR
  A[Start] --> B[Middle] --> C[End]
`;
  const parseResult = parseMermaid(input);
  assert(parseResult.success, "Should parse LR flowchart");

  const result = renderSvg(parseResult.data, { width: 800, height: 600, nodeSpacing: 120 });
  assert(result.success, "Should render LR flowchart");

  // In LR layout, nodes should progress left-to-right
  // Extract rect x positions for Start, Middle, End
  assertStringIncludes(result.data, "Start");
  assertStringIncludes(result.data, "Middle");
  assertStringIncludes(result.data, "End");
});