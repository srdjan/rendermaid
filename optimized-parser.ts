// Optimized parser with memoization and reduced re-parsing
import { match } from "npm:ts-pattern@5.0.5";
import type {
  Result, MermaidAST, MermaidNode, MermaidEdge, DiagramType, 
  NodeShape, ConnectionType, FlowchartDirection
} from "./parser.ts";
import { Ok, Err, createNode, createEdge, createAST, addNode, addEdge } from "./parser.ts";

// Optimized parsing state with memoization
type OptimizedParseState = {
  readonly input: string;
  readonly position: number;
  readonly line: number;
  readonly column: number;
  readonly memoCache: Map<string, any>; // Memoization cache
};

// Cached regex patterns (compiled once)
const REGEX_CACHE = {
  whitespace: /\s+/,
  identifier: /[a-zA-Z_][a-zA-Z0-9_]*/,
  quotedString: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/,
  flowchartDirection: /(TD|TB|BT|RL|LR)/,
  nodeContent: /[^\]})]+/,
  edgeLabel: /[^|]+/,
  skipLine: /[^\n]*\n?/
} as const;

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

// Fast line tokenizer with lookahead
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
    
    // Try shape patterns first (most common)
    let matched = false;
    for (const { pattern, shape } of SHAPE_PATTERNS) {
      const match = remaining.match(pattern);
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
    
    // Try connection patterns
    for (const { pattern, type } of CONNECTION_PATTERNS) {
      const match = remaining.match(pattern);
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
    
    // Try identifier
    const idMatch = remaining.match(REGEX_CACHE.identifier);
    if (idMatch) {
      tokens.push({
        type: 'identifier',
        value: idMatch[0],
        position
      });
      position += idMatch[0].length;
      continue;
    }
    
    // Try edge label |text|
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
    
    // Skip unknown character
    position++;
  }
  
  return tokens;
};

// Optimized edge parsing using pre-tokenized input
const parseEdgeFromTokens = (tokens: Array<{ type: string; value: string; position: number }>): {
  nodes: Array<{ id: string; label: string; shape: NodeShape }>;
  edge: MermaidEdge | null;
} | null => {
  if (tokens.length < 3) return null;
  
  let fromNode: { id: string; label: string; shape: NodeShape } | null = null;
  let toNode: { id: string; label: string; shape: NodeShape } | null = null;
  let connectionType: ConnectionType = "arrow";
  let edgeLabel: string | undefined;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === 'node') {
      const nodeData = JSON.parse(token.value);
      if (!fromNode) {
        fromNode = nodeData;
      } else if (!toNode) {
        toNode = nodeData;
      }
    } else if (token.type === 'identifier') {
      const nodeData = { id: token.value, label: token.value, shape: "rectangle" as const };
      if (!fromNode) {
        fromNode = nodeData;
      } else if (!toNode) {
        toNode = nodeData;
      }
    } else if (token.type === 'connection') {
      connectionType = token.value as ConnectionType;
    } else if (token.type === 'label') {
      edgeLabel = token.value;
    }
  }
  
  if (!fromNode || !toNode) return null;
  
  return {
    nodes: [fromNode, toNode],
    edge: createEdge(fromNode.id, toNode.id, connectionType, edgeLabel)
  };
};

// Optimized main parser
export const optimizedParseMermaid = (input: string): Result<MermaidAST> => {
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

// Performance comparison utility
export const compareParserPerformance = async (input: string, iterations: number = 1000) => {
  const { benchmark } = await import("./performance.ts");
  const { parseMermaid } = await import("./parser.ts");
  
  console.log("🔄 Parser Performance Comparison:");
  
  const originalResult = await benchmark(
    "Original Parser",
    () => parseMermaid(input),
    iterations
  );
  
  const optimizedResult = await benchmark(
    "Optimized Parser", 
    () => optimizedParseMermaid(input),
    iterations
  );
  
  const improvement = originalResult.avgTime / optimizedResult.avgTime;
  
  console.log(`Original:   ${originalResult.avgTime.toFixed(3)}ms avg`);
  console.log(`Optimized:  ${optimizedResult.avgTime.toFixed(3)}ms avg`);
  console.log(`Improvement: ${improvement.toFixed(1)}x faster`);
  
  return { original: originalResult, optimized: optimizedResult, improvement };
};