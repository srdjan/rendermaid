/**
 * Optimized Mermaid parser with improved performance
 * @module parser
 */
import { match } from "npm:ts-pattern@5.0.5";

/**
 * Result type for operations that can succeed or fail
 * @template T The type of the successful result
 * @template E The type of the error (defaults to string)
 */
export type Result<T, E = string> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

/**
 * Creates a successful result
 * @template T The type of the data
 * @param data The successful data value
 * @returns A successful Result containing the data
 */
export const Ok = <T>(data: T): Result<T> => ({ success: true, data });

/**
 * Creates an error result
 * @template E The type of the error
 * @param error The error value
 * @returns A failed Result containing the error
 */
export const Err = <E>(error: E): Result<never, E> => ({ success: false, error });

/**
 * Available node shapes for Mermaid diagrams
 */
export type NodeShape =
  | "rectangle"
  | "rounded"
  | "circle"
  | "rhombus"
  | "hexagon"
  | "stadium";

/**
 * Available connection types for edges between nodes
 */
export type ConnectionType =
  | "arrow"
  | "line"
  | "thick"
  | "dotted"
  | "dashed";

/**
 * Represents a single node in a Mermaid diagram
 */
export type MermaidNode = {
  readonly id: string;
  readonly label: string;
  readonly shape: NodeShape;
  readonly metadata?: ReadonlyMap<string, unknown>;
};

/**
 * Represents a connection between two nodes in a Mermaid diagram
 */
export type MermaidEdge = {
  /** Source node identifier */
  readonly from: string;
  /** Target node identifier */
  readonly to: string;
  /** Optional label text for the edge */
  readonly label?: string;
  /** Visual style of the connection */
  readonly type: ConnectionType;
  /** Optional metadata associated with the edge */
  readonly metadata?: ReadonlyMap<string, unknown>;
};

/**
 * Supported diagram types with their specific configurations
 */
export type DiagramType =
  | { readonly type: "flowchart"; readonly direction: FlowchartDirection }
  | { readonly type: "sequence"; readonly participants: readonly string[] }
  | { readonly type: "gantt"; readonly title?: string }
  | { readonly type: "classDiagram" }
  | { readonly type: "stateDiagram" };

/**
 * Layout directions available for flowchart diagrams
 */
export type FlowchartDirection = "TD" | "TB" | "BT" | "RL" | "LR";

/**
 * Complete Abstract Syntax Tree representation of a Mermaid diagram
 */
export type MermaidAST = {
  /** The type and configuration of the diagram */
  readonly diagramType: DiagramType;
  /** Map of all nodes in the diagram indexed by their ID */
  readonly nodes: ReadonlyMap<string, MermaidNode>;
  /** Array of all edges connecting nodes */
  readonly edges: readonly MermaidEdge[];
  /** Additional metadata about the diagram */
  readonly metadata: ReadonlyMap<string, unknown>;
};

/**
 * Creates a new diagram node with the specified properties
 * @param id Unique identifier for the node
 * @param label Display text for the node
 * @param shape Visual shape of the node (defaults to "rectangle")
 * @param metadata Optional metadata to associate with the node
 * @returns A new MermaidNode instance
 */
export const createNode = (
  id: string,
  label: string,
  shape: NodeShape = "rectangle",
  metadata?: ReadonlyMap<string, unknown>
): MermaidNode => ({
  id,
  label,
  shape,
  metadata,
});

/**
 * Creates a new edge connecting two nodes
 * @param from Source node identifier
 * @param to Target node identifier
 * @param type Visual style of the connection (defaults to "arrow")
 * @param label Optional label text for the edge
 * @param metadata Optional metadata to associate with the edge
 * @returns A new MermaidEdge instance
 */
export const createEdge = (
  from: string,
  to: string,
  type: ConnectionType = "arrow",
  label?: string,
  metadata?: ReadonlyMap<string, unknown>
): MermaidEdge => ({
  from,
  to,
  type,
  label,
  metadata,
});

/**
 * Creates a new empty AST with the specified diagram type
 * @param diagramType The type and configuration of the diagram
 * @param nodes Initial map of nodes (defaults to empty)
 * @param edges Initial array of edges (defaults to empty)
 * @param metadata Initial metadata map (defaults to empty)
 * @returns A new MermaidAST instance
 */
export const createAST = (
  diagramType: DiagramType,
  nodes: ReadonlyMap<string, MermaidNode> = new Map(),
  edges: readonly MermaidEdge[] = [],
  metadata: ReadonlyMap<string, unknown> = new Map()
): MermaidAST => ({
  diagramType,
  nodes,
  edges,
  metadata,
});

/**
 * Adds a node to an existing AST, returning a new AST instance
 * @param ast The AST to add the node to
 * @param node The node to add
 * @returns A new AST instance with the node added
 */
export const addNode = (ast: MermaidAST, node: MermaidNode): MermaidAST => {
  const newNodes = new Map(ast.nodes);
  newNodes.set(node.id, node);
  return {
    ...ast,
    nodes: newNodes,
  };
};

/**
 * Adds an edge to an existing AST, returning a new AST instance
 * @param ast The AST to add the edge to
 * @param edge The edge to add
 * @returns A new AST instance with the edge added
 */
export const addEdge = (ast: MermaidAST, edge: MermaidEdge): MermaidAST => ({
  ...ast,
  edges: [...ast.edges, edge],
});

/**
 * Gets the opening and closing symbols for a node shape
 * @param shape The node shape to get symbols for
 * @returns A tuple of [opening, closing] symbols
 */
export const getNodeShapeSymbols = (shape: NodeShape): readonly [string, string] =>
  match(shape)
    .with("rectangle", () => ["[", "]"] as const)
    .with("rounded", () => ["(", ")"] as const)
    .with("circle", () => ["((", "))"] as const)
    .with("rhombus", () => ["{", "}"] as const)
    .with("hexagon", () => ["{{", "}}"] as const)
    .with("stadium", () => ["([", "])"] as const)
    .exhaustive();

// ===================== OPTIMIZED PARSER IMPLEMENTATION =====================

// Pre-compiled shape patterns for faster matching
const SHAPE_PATTERNS = [
  { pattern: /([a-zA-Z_][a-zA-Z0-9_]*)\(\[([^\]]+)\]\)/, shape: "stadium" as const },
  { pattern: /([a-zA-Z_][a-zA-Z0-9_]*)\(\(([^)]+)\)\)/, shape: "circle" as const },
  { pattern: /([a-zA-Z_][a-zA-Z0-9_]*)\{\{([^}]+)\}\}/, shape: "hexagon" as const },
  { pattern: /([a-zA-Z_][a-zA-Z0-9_]*)\{([^}]+)\}/, shape: "rhombus" as const },
  { pattern: /([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]+)\)/, shape: "rounded" as const },
  { pattern: /([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]/, shape: "rectangle" as const }
] as const;

// Pre-compiled connection patterns
const CONNECTION_PATTERNS = [
  { pattern: /-.->/, type: "dotted" as const },
  { pattern: /==>/, type: "thick" as const },
  { pattern: /---/, type: "dashed" as const },
  { pattern: /-->/, type: "arrow" as const }
] as const;

// Fast line tokenizer - properly anchored patterns
const tokenizeLine = (line: string): Array<{ type: string; value: string; position: number }> => {
  const tokens: Array<{ type: string; value: string; position: number }> = [];
  let position = 0;
  
  while (position < line.length) {
    const remaining = line.slice(position);
    
    // Skip whitespace
    const wsMatch = remaining.match(/^\s+/);
    if (wsMatch) {
      position += wsMatch[0].length;
      continue;
    }
    
    // Try shape patterns first - anchored to start with ^
    let matched = false;
    for (const { pattern, shape } of SHAPE_PATTERNS) {
      // Create anchored version of pattern
      const anchoredPattern = new RegExp('^' + pattern.source);
      const match = remaining.match(anchoredPattern);
      if (match) {
        tokens.push({
          type: 'node',
          value: JSON.stringify({ id: match[1], label: match[2], shape }),
          position
        });
        position += match[0].length;
        matched = true;
        break;
      }
    }
    
    if (matched) continue;
    
    // Try connection patterns - anchored to start
    for (const { pattern, type } of CONNECTION_PATTERNS) {
      const anchoredPattern = new RegExp('^' + pattern.source);
      const match = remaining.match(anchoredPattern);
      if (match) {
        tokens.push({
          type: 'connection',
          value: type,
          position
        });
        position += match[0].length;
        matched = true;
        break;
      }
    }
    
    if (matched) continue;
    
    // Try edge label |text| - must start with |
    if (remaining.startsWith('|')) {
      const labelEnd = remaining.indexOf('|', 1);
      if (labelEnd > 0) {
        tokens.push({
          type: 'label',
          value: remaining.slice(1, labelEnd),
          position
        });
        position += labelEnd + 1;
        continue;
      }
    }
    
    // Try identifier - anchored to start
    const idMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (idMatch) {
      tokens.push({
        type: 'identifier',
        value: idMatch[0],
        position
      });
      position += idMatch[0].length;
      continue;
    }
    
    // Skip unknown character
    position++;
  }
  
  return tokens;
};

// Parse edge from tokens - handles more complex edge patterns
const parseEdgeFromTokens = (tokens: Array<{ type: string; value: string; position: number }>): {
  nodes: Array<{ id: string; label: string; shape: NodeShape }>;
  edge: MermaidEdge | null;
} | null => {
  if (tokens.length < 3) return null;
  
  const nodeTokens: Array<{ id: string; label: string; shape: NodeShape }> = [];
  let connectionType: ConnectionType = "arrow";
  let edgeLabel: string | undefined;
  
  // First pass: collect all nodes and connection info
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === 'node') {
      const nodeData = JSON.parse(token.value);
      nodeTokens.push(nodeData);
    } else if (token.type === 'identifier') {
      const nodeData = { id: token.value, label: token.value, shape: "rectangle" as const };
      nodeTokens.push(nodeData);
    } else if (token.type === 'connection') {
      connectionType = token.value as ConnectionType;
    } else if (token.type === 'label') {
      edgeLabel = token.value;
    }
  }
  
  // Need at least 2 nodes for an edge
  if (nodeTokens.length < 2) return null;
  
  const fromNode = nodeTokens[0];
  const toNode = nodeTokens[1];
  
  return {
    nodes: nodeTokens,
    edge: createEdge(fromNode.id, toNode.id, connectionType, edgeLabel)
  };
};

/**
 * Parses a Mermaid diagram string into an Abstract Syntax Tree
 * @param input The Mermaid diagram source code
 * @returns A Result containing either the parsed AST or an error message
 * @example
 * ```typescript
 * const result = parseMermaid(`
 *   flowchart TD
 *     A[Start] --> B{Decision}
 *     B -->|Yes| C[Process]
 * `);
 * 
 * if (result.success) {
 *   console.log(result.data.nodes.size); // Number of nodes
 * }
 * ```
 */
export const parseMermaid = (input: string): Result<MermaidAST> => {
  const lines = input.trim().split('\n');
  if (lines.length === 0) return Err("Empty input");
  
  // Parse header
  const headerLine = lines[0].trim();
  const headerMatch = headerLine.match(/^flowchart\s+(TD|TB|BT|RL|LR)$/);
  if (!headerMatch) return Err("Invalid flowchart header");
  
  const diagramType: DiagramType = {
    type: "flowchart",
    direction: headerMatch[1] as FlowchartDirection
  };
  
  let ast = createAST(diagramType);
  const processedNodes = new Set<string>();
  
  // Process remaining lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const tokens = tokenizeLine(line);
    const edgeResult = parseEdgeFromTokens(tokens);
    
    if (edgeResult) {
      // Add nodes if not already processed
      edgeResult.nodes.forEach(nodeData => {
        if (!processedNodes.has(nodeData.id)) {
          const node = createNode(nodeData.id, nodeData.label, nodeData.shape);
          ast = addNode(ast, node);
          processedNodes.add(nodeData.id);
        }
      });
      
      if (edgeResult.edge) {
        ast = addEdge(ast, edgeResult.edge);
      }
    }
  }
  
  return Ok(ast);
};