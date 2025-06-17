/**
 * Utility functions for AST analysis, validation, and transformation
 */

import { type MermaidAST } from "./parser.ts";

export type OutputTarget = "file" | "console" | "memory";

export interface ASTAnalysis {
  complexity: number;
  nodeShapes: Record<string, number>;
  edgeTypes: Record<string, number>;
  depth: number;
  cycleDetected: boolean;
}

/**
 * Analyze AST structure and complexity
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
 * Validate AST structure
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
 * Transform AST using a transformer function
 */
export function transformAST<T extends MermaidAST>(
  ast: T, 
  transformer: (ast: T) => T
): T {
  return transformer(ast);
}

/**
 * Enhance AST with additional metadata
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
 * Function composition utility
 */
export function compose<T>(...fns: Array<(x: T) => T>): (x: T) => T {
  return (x: T) => fns.reduceRight((acc, fn) => fn(acc), x);
}

/**
 * Performance monitoring wrapper
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
 * Render for specific target
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