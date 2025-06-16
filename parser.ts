import { match, P } from "npm:ts-pattern@5.0.5";

// Base Result type for error handling
export type Result<T, E = string> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export const Ok = <T>(data: T): Result<T> => ({ success: true, data });
export const Err = <E>(error: E): Result<never, E> => ({ success: false, error });

// Node shape types
export type NodeShape =
  | "rectangle"
  | "rounded"
  | "circle"
  | "rhombus"
  | "hexagon"
  | "stadium";

// Connection types
export type ConnectionType =
  | "arrow"
  | "line"
  | "thick"
  | "dotted"
  | "dashed";

// Core AST Node types using discriminated unions
export type MermaidNode = {
  readonly id: string;
  readonly label: string;
  readonly shape: NodeShape;
  readonly metadata?: ReadonlyMap<string, unknown>;
};

export type MermaidEdge = {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly type: ConnectionType;
  readonly metadata?: ReadonlyMap<string, unknown>;
};

// Diagram types using algebraic data types
export type DiagramType =
  | { readonly type: "flowchart"; readonly direction: FlowchartDirection }
  | { readonly type: "sequence"; readonly participants: readonly string[] }
  | { readonly type: "gantt"; readonly title?: string }
  | { readonly type: "classDiagram" }
  | { readonly type: "stateDiagram" };

export type FlowchartDirection = "TD" | "TB" | "BT" | "RL" | "LR";

// Complete AST representation
export type MermaidAST = {
  readonly diagramType: DiagramType;
  readonly nodes: ReadonlyMap<string, MermaidNode>;
  readonly edges: readonly MermaidEdge[];
  readonly metadata: ReadonlyMap<string, unknown>;
};

// Parser state for functional parsing
export type ParseState = {
  readonly input: string;
  readonly position: number;
  readonly line: number;
  readonly column: number;
};

export type Parser<T> = (state: ParseState) => Result<{
  readonly value: T;
  readonly nextState: ParseState;
}>;

// Utility functions for parser combinators
export const parseSuccess = <T>(value: T, nextState: ParseState) =>
  Ok({ value, nextState });

export const parseError = (message: string) =>
  Err(message);

// Advance parser state
export const advanceState = (state: ParseState, chars: number = 1): ParseState => ({
  ...state,
  position: state.position + chars,
  column: state.column + chars,
});

export const advanceLine = (state: ParseState): ParseState => ({
  ...state,
  position: state.position + 1,
  line: state.line + 1,
  column: 1,
});

// Pattern matching utilities for AST processing
export const matchDiagramType = <T>(diagram: DiagramType) =>
  match(diagram)
    .with({ type: "flowchart" }, (d) => d)
    .with({ type: "sequence" }, (d) => d)
    .with({ type: "gantt" }, (d) => d)
    .with({ type: "classDiagram" }, (d) => d)
    .with({ type: "stateDiagram" }, (d) => d)
    .exhaustive();

// Type-safe node shape matching
export const getNodeShapeSymbols = (shape: NodeShape): readonly [string, string] =>
  match(shape)
    .with("rectangle", () => ["[", "]"] as const)
    .with("rounded", () => ["(", ")"] as const)
    .with("circle", () => ["((", "))"] as const)
    .with("rhombus", () => ["{", "}"] as const)
    .with("hexagon", () => ["{{", "}}"] as const)
    .with("stadium", () => ["([", "])"] as const)
    .exhaustive();

// Immutable AST builder functions
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

// Functional AST manipulation
export const addNode = (ast: MermaidAST, node: MermaidNode): MermaidAST => ({
  ...ast,
  nodes: new Map(ast.nodes.set(node.id, node)),
});

export const addEdge = (ast: MermaidAST, edge: MermaidEdge): MermaidAST => ({
  ...ast,
  edges: [...ast.edges, edge],
});

// Type-safe metadata operations
export const setMetadata = <T>(
  target: { metadata?: ReadonlyMap<string, unknown> },
  key: string,
  value: T
) => ({
  ...target,
  metadata: new Map((target.metadata || new Map()).set(key, value)),
});

// Functional Parser Combinators for Mermaid Syntax
// Pure functions with monadic composition patterns

// import { match } from "npm:ts-pattern@5.0.5";
// import type {
//   Result, Parser, ParseState, MermaidAST, MermaidNode, MermaidEdge,
//   DiagramType, NodeShape, ConnectionType, FlowchartDirection
// } from "./types.ts";
// import {
//   Ok, Err, parseSuccess, parseError, advanceState, advanceLine,
//   createNode, createEdge, createAST, addNode, addEdge
// } from "./types.ts";

// Core parser combinators using functional composition
export const char = (expected: string): Parser<string> => (state) => {
  if (state.position >= state.input.length) {
    return parseError(`Expected '${expected}' but reached end of input`);
  }

  const actual = state.input[state.position];
  if (actual !== expected) {
    return parseError(`Expected '${expected}' but found '${actual}'`);
  }

  const nextState = actual === '\n'
    ? advanceLine(state)
    : advanceState(state);

  return parseSuccess(actual, nextState);
};

export const string = (expected: string): Parser<string> => (state) => {
  if (state.position + expected.length > state.input.length) {
    return parseError(`Expected '${expected}' but reached end of input`);
  }

  const actual = state.input.slice(state.position, state.position + expected.length);
  if (actual !== expected) {
    return parseError(`Expected '${expected}' but found '${actual}'`);
  }

  return parseSuccess(actual, advanceState(state, expected.length));
};

export const regex = (pattern: RegExp): Parser<string> => (state) => {
  const remaining = state.input.slice(state.position);
  const match = remaining.match(pattern);

  if (!match || match.index !== 0) {
    return parseError(`No match for pattern ${pattern}`);
  }

  const matched = match[0];
  return parseSuccess(matched, advanceState(state, matched.length));
};

// Monadic parser combinators
export const map = <A, B>(parser: Parser<A>, fn: (a: A) => B): Parser<B> =>
  (state) => {
    const result = parser(state);
    return result.success
      ? parseSuccess(fn(result.data.value), result.data.nextState)
      : result;
  };

export const flatMap = <A, B>(parser: Parser<A>, fn: (a: A) => Parser<B>): Parser<B> =>
  (state) => {
    const result = parser(state);
    return result.success
      ? fn(result.data.value)(result.data.nextState)
      : result;
  };

export const or = <A>(...parsers: Parser<A>[]): Parser<A> =>
  (state) => {
    for (const parser of parsers) {
      const result = parser(state);
      if (result.success) return result;
    }
    return parseError("No alternative matched");
  };

export const optional = <A>(parser: Parser<A>): Parser<A | null> =>
  (state) => {
    const result = parser(state);
    return result.success
      ? result
      : parseSuccess(null, state);
  };

export const many = <A>(parser: Parser<A>): Parser<readonly A[]> =>
  (state) => {
    const results: A[] = [];
    let currentState = state;

    while (true) {
      const result = parser(currentState);
      if (!result.success) break;

      results.push(result.data.value);
      currentState = result.data.nextState;
    }

    return parseSuccess(results, currentState);
  };

export const sequence = <T extends readonly unknown[]>(
  ...parsers: { [K in keyof T]: Parser<T[K]> }
): Parser<T> =>
  (state) => {
    const results: unknown[] = [];
    let currentState = state;

    for (const parser of parsers) {
      const result = parser(currentState);
      if (!result.success) return result;

      results.push(result.data.value);
      currentState = result.data.nextState;
    }

    return parseSuccess(results as T, currentState);
  };

// Whitespace and utility parsers
export const whitespace = regex(/\s+/);
export const optionalWhitespace = optional(whitespace);
export const identifier = regex(/[a-zA-Z_][a-zA-Z0-9_]*/);
export const quotedString = or(
  map(regex(/"([^"\\]|\\.)*"/), s => s.slice(1, -1)),
  map(regex(/'([^'\\]|\\.)*'/), s => s.slice(1, -1))
);

// Diagram type parsers
export const flowchartDirection: Parser<FlowchartDirection> =
  or(
    map(string("TD"), () => "TD" as const),
    map(string("TB"), () => "TB" as const),
    map(string("BT"), () => "BT" as const),
    map(string("RL"), () => "RL" as const),
    map(string("LR"), () => "LR" as const)
  );

export const flowchartHeader: Parser<DiagramType> =
  map(
    sequence(string("flowchart"), whitespace, flowchartDirection),
    ([, , direction]) => ({ type: "flowchart", direction } as const)
  );

// Node shape parsers using pattern matching
export const nodeWithShape = (
  openSymbol: string,
  closeSymbol: string,
  shape: NodeShape
): Parser<{ id: string; label: string; shape: NodeShape }> =>
  map(
    sequence(
      identifier,
      openSymbol.length > 1 ? string(openSymbol) : char(openSymbol),
      or(quotedString, regex(/[^\]})]+/)),
      closeSymbol.length > 1 ? string(closeSymbol) : char(closeSymbol)
    ),
    ([id, , label]) => ({ id, label, shape })
  );

export const nodeParser: Parser<{ id: string; label: string; shape: NodeShape }> =
  or(
    nodeWithShape("([", "])", "stadium"),
    nodeWithShape("((", "))", "circle"),
    nodeWithShape("{{", "}}", "hexagon"),
    nodeWithShape("{", "}", "rhombus"),
    nodeWithShape("(", ")", "rounded"),
    nodeWithShape("[", "]", "rectangle")
  );

// Connection type parsers
export const connectionParser: Parser<ConnectionType> =
  or(
    map(string("-.->"), () => "dotted" as const),
    map(string("==>"), () => "thick" as const),
    map(string("---"), () => "dashed" as const),
    map(string("-->"), () => "arrow" as const),
    map(string("---"), () => "line" as const)
  );

// Parse node definition inline (e.g., "A[Start]" or "B{Decision}")
export const inlineNodeParser: Parser<{ id: string; label: string; shape: NodeShape }> =
  map(
    sequence(
      identifier,
      or(
        map(sequence(char("["), regex(/[^\]]+/), char("]")), ([, label]) => ({ label, shape: "rectangle" as const })),
        map(sequence(char("{"), regex(/[^}]+/), char("}")), ([, label]) => ({ label, shape: "rhombus" as const })),
        map(sequence(string("(["), regex(/[^\]]+/), string("])")), ([, label]) => ({ label, shape: "stadium" as const })),
        map(sequence(string("(("), regex(/[^\)]+/), string("))")), ([, label]) => ({ label, shape: "circle" as const })),
        map(sequence(char("("), regex(/[^\)]+/), char(")")), ([, label]) => ({ label, shape: "rounded" as const })),
        map(sequence(string("[("), regex(/[^\)]+/), string(")]")), ([, label]) => ({ label, shape: "hexagon" as const }))
      )
    ),
    ([id, shapeData]) => ({ id, label: shapeData.label, shape: shapeData.shape })
  );

// Edge parser with optional labels and inline node definitions
export const edgeParser: Parser<{ nodes: Array<{ id: string; label: string; shape: NodeShape }>, edge: MermaidEdge }> =
  map(
    sequence(
      or(inlineNodeParser, map(identifier, id => ({ id, label: id, shape: "rectangle" as const }))),
      optionalWhitespace,
      connectionParser,
      optionalWhitespace,
      optional(map(sequence(char("|"), regex(/[^|]+/), char("|")), ([, label]) => label)),
      optionalWhitespace,
      or(inlineNodeParser, map(identifier, id => ({ id, label: id, shape: "rectangle" as const })))
    ),
    ([fromNode, , type, , label, , toNode]) => ({
      nodes: [fromNode, toNode],
      edge: createEdge(fromNode.id, toNode.id, type, label || undefined)
    })
  );

// Main diagram parser using functional composition
export const parseMermaidDiagram: Parser<MermaidAST> =
  (state) => {
    // Parse diagram header
    const headerResult = flowchartHeader(state);
    if (!headerResult.success) return headerResult;

    const { value: diagramType, nextState: afterHeader } = headerResult.data;

    // Skip newlines and whitespace
    const wsResult = optional(regex(/\s*\n/))(afterHeader);
    if (!wsResult.success) return wsResult;

    let currentState = wsResult.data.nextState;
    let ast = createAST(diagramType);

    // Parse nodes and edges
    while (currentState.position < currentState.input.length) {
      // Skip whitespace
      const wsSkip = optional(whitespace)(currentState);
      if (!wsSkip.success) break;
      currentState = wsSkip.data.nextState;

      if (currentState.position >= currentState.input.length) break;

      // Try to parse an edge (which includes inline node definitions)
      const edgeResult = edgeParser(currentState);
      if (edgeResult.success) {
        const { nodes, edge } = edgeResult.data.value;
        
        // Add nodes if they don't exist
        nodes.forEach(nodeData => {
          if (!ast.nodes.has(nodeData.id)) {
            const node = createNode(nodeData.id, nodeData.label, nodeData.shape);
            ast = addNode(ast, node);
          }
        });
        
        // Add the edge
        ast = addEdge(ast, edge);
        currentState = edgeResult.data.nextState;
        continue;
      }

      // Try to parse a standalone node
      const nodeResult = inlineNodeParser(currentState);
      if (nodeResult.success) {
        const { id, label, shape } = nodeResult.data.value;
        if (!ast.nodes.has(id)) {
          const node = createNode(id, label, shape);
          ast = addNode(ast, node);
        }
        currentState = nodeResult.data.nextState;
        continue;
      }

      // Skip to next line if nothing matched
      const skipLine = regex(/[^\n]*\n?/)(currentState);
      if (skipLine.success) {
        currentState = skipLine.data.nextState;
      } else {
        break;
      }
    }

    return parseSuccess(ast, currentState);
  };

// High-level parse function
export const parseMermaid = (input: string): Result<MermaidAST> => {
  const initialState: ParseState = {
    input: input.trim(),
    position: 0,
    line: 1,
    column: 1,
  };

  const result = parseMermaidDiagram(initialState);
  return result.success
    ? Ok(result.data.value)
    : Err(result.error);
};