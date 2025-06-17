/**
 * Utility functions for AST analysis, validation, and transformation
 * @module utils
 */

import { type MermaidAST } from "./parser.ts";

/**
 * Available output targets for rendering operations
 */
export type OutputTarget = "file" | "console" | "memory";

/**
 * Comprehensive analysis results for a Mermaid AST
 */
export interface ASTAnalysis {
  /** Overall complexity score based on nodes, edges, and variety */
  complexity: number;
  /** Count of each node shape type used */
  nodeShapes: Record<string, number>;
  /** Count of each edge type used */
  edgeTypes: Record<string, number>;
  /** Maximum depth of the diagram graph */
  depth: number;
  /** Whether the diagram contains cycles */
  cycleDetected: boolean;
}

/**
 * Analyzes AST structure and calculates complexity metrics
 * @param ast The Abstract Syntax Tree to analyze
 * @returns Detailed analysis results including complexity, shapes, and structure
 */
export function analyzeAST(ast: MermaidAST): ASTAnalysis {
  const nodeShapes: Record<string, number> = {};
  const edgeTypes: Record<string, number> = {};
  
  // Count node shapes
  for (const [, node] of ast.nodes) {
    nodeShapes[node.shape] = (nodeShapes[node.shape] || 0) + 1;
  }
  
  // Count edge types
  for (const edge of ast.edges) {
    edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
  }
  
  // Calculate complexity (nodes + edges + shape variety)
  const complexity = ast.nodes.size + ast.edges.length + Object.keys(nodeShapes).length;
  
  return {
    complexity,
    nodeShapes,
    edgeTypes,
    depth: calculateDepth(ast),
    cycleDetected: detectCycles(ast)
  };
}

/**
 * Validates AST structure and returns any integrity issues found
 * @param ast The Abstract Syntax Tree to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateAST(ast: MermaidAST): string[] {
  const errors: string[] = [];
  
  // Check for orphaned edges
  for (const edge of ast.edges) {
    if (!ast.nodes.has(edge.from)) {
      errors.push(`Edge references non-existent source node: ${edge.from}`);
    }
    if (!ast.nodes.has(edge.to)) {
      errors.push(`Edge references non-existent target node: ${edge.to}`);
    }
  }
  
  // Check for empty labels
  for (const [, node] of ast.nodes) {
    if (!node.label || node.label.trim() === "") {
      errors.push(`Node ${node.id} has empty label`);
    }
  }
  
  return errors;
}

/**
 * Transforms an AST using a provided transformer function
 * @template T The specific AST type being transformed
 * @param ast The Abstract Syntax Tree to transform
 * @param transformer Function that takes an AST and returns a modified AST
 * @returns The transformed AST
 */
export function transformAST<T extends MermaidAST>(
  ast: T, 
  transformer: (ast: T) => T
): T {
  return transformer(ast);
}

/**
 * Enhances an AST by adding analysis metadata and timestamp
 * @param ast The Abstract Syntax Tree to enhance
 * @returns New AST instance with additional metadata
 */
export function enhanceAST(ast: MermaidAST): MermaidAST {
  const analysis = analyzeAST(ast);
  const newMetadata = new Map(ast.metadata);
  newMetadata.set("analysis", analysis);
  newMetadata.set("enhancedAt", new Date().toISOString());
  
  return {
    ...ast,
    metadata: newMetadata
  };
}

/**
 * Composes multiple functions into a single function that applies them right-to-left
 * @template T The type that flows through the composed functions
 * @param fns Array of functions to compose
 * @returns A single composed function
 */
export function compose<T>(...fns: Array<(x: T) => T>): (x: T) => T {
  return (x: T) => fns.reduceRight((acc, fn) => fn(acc), x);
}

/**
 * Wraps a function with performance monitoring that logs execution time
 * @template T The argument types of the function
 * @template R The return type of the function
 * @param fn The function to monitor
 * @param label Label to use in the performance log
 * @returns Wrapped function that logs execution time
 */
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => R,
  label: string
): (...args: T) => R {
  return (...args: T): R => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  };
}

/**
 * Returns a target-specific output string for rendering operations
 * @param target The output target to render for
 * @returns A string indicating the target type
 */
export function renderForTarget(target: OutputTarget): string {
  switch (target) {
    case "file":
      return "file-output";
    case "console":
      return "console-output";
    case "memory":
      return "memory-output";
    default:
      return "unknown-target";
  }
}

// Helper functions
function calculateDepth(ast: MermaidAST): number {
  const visited = new Set<string>();
  let maxDepth = 0;
  
  function dfs(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    maxDepth = Math.max(maxDepth, depth);
    
    const outgoingEdges = ast.edges.filter(e => e.from === nodeId);
    for (const edge of outgoingEdges) {
      dfs(edge.to, depth + 1);
    }
  }
  
  // Start DFS from nodes with no incoming edges
  const hasIncoming = new Set(ast.edges.map(e => e.to));
  for (const [nodeId] of ast.nodes) {
    if (!hasIncoming.has(nodeId)) {
      dfs(nodeId, 1);
    }
  }
  
  return maxDepth;
}

function detectCycles(ast: MermaidAST): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const outgoingEdges = ast.edges.filter(e => e.from === nodeId);
    for (const edge of outgoingEdges) {
      if (hasCycle(edge.to)) return true;
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  for (const [nodeId] of ast.nodes) {
    if (hasCycle(nodeId)) return true;
  }
  
  return false;
}