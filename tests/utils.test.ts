/**
 * Unit tests for utils module
 */

import { assertEquals, assertExists, assert } from "@std/assert";
import { 
  analyzeAST,
  validateAST,
  transformAST,
  enhanceAST,
  compose,
  withPerformanceMonitoring,
  renderForTarget,
  type OutputTarget,
  type ASTAnalysis
} from "../lib/utils.ts";
import { createAST, createNode, createEdge, addNode, addEdge, type MermaidAST } from "../lib/parser.ts";

// Helper function to create test AST
function createTestAST(): MermaidAST {
  let ast = createAST({ type: "flowchart", direction: "TD" });
  const nodeA = createNode("A", "Start", "rectangle");
  const nodeB = createNode("B", "Decision", "rhombus");
  const nodeC = createNode("C", "End", "circle");
  const edge1 = createEdge("A", "B", "arrow");
  const edge2 = createEdge("B", "C", "arrow", "Yes");
  
  ast = addNode(ast, nodeA);
  ast = addNode(ast, nodeB);
  ast = addNode(ast, nodeC);
  ast = addEdge(ast, edge1);
  ast = addEdge(ast, edge2);
  
  return ast;
}

Deno.test("Utils - AST analysis basic functionality", () => {
  const ast = createTestAST();
  const analysis = analyzeAST(ast);
  
  assertEquals(analysis.complexity, 8); // 3 nodes + 2 edges + 3 shape types
  assertEquals(analysis.nodeShapes["rectangle"], 1);
  assertEquals(analysis.nodeShapes["rhombus"], 1);
  assertEquals(analysis.nodeShapes["circle"], 1);
  assertEquals(analysis.edgeTypes["arrow"], 2);
  assertEquals(analysis.depth, 3);
  assertEquals(analysis.cycleDetected, false);
});

Deno.test("Utils - AST validation with valid AST", () => {
  const ast = createTestAST();
  const errors = validateAST(ast);
  
  assertEquals(errors.length, 0);
});

Deno.test("Utils - AST validation with orphaned edges", () => {
  let ast = createAST({ type: "flowchart", direction: "TD" });
  const nodeA = createNode("A", "Start", "rectangle");
  const edge = createEdge("A", "B", "arrow"); // B doesn't exist
  
  ast = addNode(ast, nodeA);
  ast = addEdge(ast, edge);
  
  const errors = validateAST(ast);
  assertEquals(errors.length, 1);
  assert(errors[0].includes("non-existent target node: B"));
});

Deno.test("Utils - AST validation with empty labels", () => {
  let ast = createAST({ type: "flowchart", direction: "TD" });
  const nodeA = createNode("A", "", "rectangle"); // Empty label
  
  ast = addNode(ast, nodeA);
  
  const errors = validateAST(ast);
  assertEquals(errors.length, 1);
  assert(errors[0].includes("has empty label"));
});

Deno.test("Utils - AST transformation", () => {
  const ast = createTestAST();
  
  const addMetadataTransformer = (ast: MermaidAST): MermaidAST => ({
    ...ast,
    metadata: new Map([...ast.metadata, ["transformed", true]])
  });
  
  const transformedAST = transformAST(ast, addMetadataTransformer);
  assertEquals(transformedAST.metadata.get("transformed"), true);
});

Deno.test("Utils - AST enhancement", () => {
  const ast = createTestAST();
  const enhancedAST = enhanceAST(ast);
  
  assertExists(enhancedAST.metadata.get("analysis"));
  assertExists(enhancedAST.metadata.get("enhancedAt"));
  
  const analysis = enhancedAST.metadata.get("analysis") as ASTAnalysis;
  assertEquals(analysis.complexity, 8);
});

Deno.test("Utils - Function composition", () => {
  const add1 = (x: number) => x + 1;
  const multiply2 = (x: number) => x * 2;
  const subtract3 = (x: number) => x - 3;
  
  const composed = compose(subtract3, multiply2, add1);
  const result = composed(5); // subtract3(multiply2(add1(5))) = subtract3(multiply2(6)) = subtract3(12) = 9
  
  assertEquals(result, 9);
});

Deno.test("Utils - Performance monitoring wrapper", () => {
  const slowFunction = (n: number) => {
    // Simulate some work
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += i;
    }
    return sum;
  };
  
  const monitoredFunction = withPerformanceMonitoring(slowFunction, "Test Function");
  const result = monitoredFunction(1000);
  
  assertEquals(result, 499500); // Sum of 0 to 999
});

Deno.test("Utils - Render for target variations", () => {
  const targets: OutputTarget[] = ["file", "console", "memory"];
  
  targets.forEach(target => {
    const result = renderForTarget(target);
    assertEquals(result, `${target}-output`);
  });
});

Deno.test("Utils - Render for unknown target", () => {
  const result = renderForTarget("unknown" as OutputTarget);
  assertEquals(result, "unknown-target");
});

Deno.test("Utils - Cycle detection with no cycles", () => {
  const ast = createTestAST();
  const analysis = analyzeAST(ast);
  
  assertEquals(analysis.cycleDetected, false);
});

Deno.test("Utils - Cycle detection with cycles", () => {
  let ast = createAST({ type: "flowchart", direction: "TD" });
  const nodeA = createNode("A", "Start", "rectangle");
  const nodeB = createNode("B", "Middle", "rectangle");
  const nodeC = createNode("C", "End", "rectangle");
  
  // Create a cycle: A -> B -> C -> A
  const edge1 = createEdge("A", "B", "arrow");
  const edge2 = createEdge("B", "C", "arrow");
  const edge3 = createEdge("C", "A", "arrow"); // Creates cycle
  
  ast = addNode(ast, nodeA);
  ast = addNode(ast, nodeB);
  ast = addNode(ast, nodeC);
  ast = addEdge(ast, edge1);
  ast = addEdge(ast, edge2);
  ast = addEdge(ast, edge3);
  
  const analysis = analyzeAST(ast);
  assertEquals(analysis.cycleDetected, true);
});

Deno.test("Utils - Depth calculation linear graph", () => {
  let ast = createAST({ type: "flowchart", direction: "TD" });
  const nodeA = createNode("A", "1", "rectangle");
  const nodeB = createNode("B", "2", "rectangle");
  const nodeC = createNode("C", "3", "rectangle");
  const nodeD = createNode("D", "4", "rectangle");
  
  // Linear chain: A -> B -> C -> D
  const edge1 = createEdge("A", "B", "arrow");
  const edge2 = createEdge("B", "C", "arrow");
  const edge3 = createEdge("C", "D", "arrow");
  
  ast = addNode(ast, nodeA);
  ast = addNode(ast, nodeB);
  ast = addNode(ast, nodeC);
  ast = addNode(ast, nodeD);
  ast = addEdge(ast, edge1);
  ast = addEdge(ast, edge2);
  ast = addEdge(ast, edge3);
  
  const analysis = analyzeAST(ast);
  assertEquals(analysis.depth, 4);
});

Deno.test("Utils - Complex analysis with multiple paths", () => {
  let ast = createAST({ type: "flowchart", direction: "TD" });
  
  // Create a more complex graph
  const nodes = [
    createNode("A", "Start", "rectangle"),
    createNode("B", "Decision", "rhombus"),
    createNode("C", "Process 1", "rectangle"),
    createNode("D", "Process 2", "rectangle"),
    createNode("E", "End", "circle")
  ];
  
  const edges = [
    createEdge("A", "B", "arrow"),
    createEdge("B", "C", "arrow", "Yes"),
    createEdge("B", "D", "arrow", "No"),
    createEdge("C", "E", "arrow"),
    createEdge("D", "E", "arrow")
  ];
  
  // Add all nodes and edges
  for (const node of nodes) {
    ast = addNode(ast, node);
  }
  for (const edge of edges) {
    ast = addEdge(ast, edge);
  }
  
  const analysis = analyzeAST(ast);
  
  assertEquals(analysis.complexity, 13); // 5 nodes + 5 edges + 3 shape types
  assertEquals(analysis.nodeShapes["rectangle"], 3);
  assertEquals(analysis.nodeShapes["rhombus"], 1);
  assertEquals(analysis.nodeShapes["circle"], 1);
  assertEquals(analysis.edgeTypes["arrow"], 5);
  assertEquals(analysis.depth, 4); // A->B->C->E or A->B->D->E path is 4 deep
  assertEquals(analysis.cycleDetected, false);
});