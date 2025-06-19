import { match } from "ts-pattern";
import { parseMermaid, type MermaidAST, type Result } from "../lib/parser.ts";
import { renderSvg, renderHtml, renderJson, renderMermaid } from "../lib/renderers.ts";

// Example Mermaid diagrams for testing
const flowchartExample = `
flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process A]
  B -->|No| D[Process B]
  C --> E[End]
  D --> E[End]
`;

const complexFlowchart = `
flowchart LR
  A([User Input]) --> B{Validate}
  B -->|Valid| C[Process Data]
  B -->|Invalid| D[Show Error]
  C --> E[(Database)]
  E --> F[Generate Report]
  F --> G((Success))
  D --> H[Retry]
  H --> A
`;

const zkProofFlowchart = `
flowchart TD
    TS[Trusted Setup] --> P[Prover]
    TS --> V[Verifier]
    P --> P2[Generate ZK proof using secret + public parameters]
    P2 --> V2[Send proof]
    V2 --> V3{Verify proof using public parameters}
    V3 -->|Proof is valid| A1[✅ Accept]
    V3 -->|Proof is invalid| A2[❌ Reject]
`;

// Functional pipeline for processing multiple diagrams
const processDiagram = (input: string) =>
  parseMermaid(input)
    .success ? {
    source: input,
    ast: (parseMermaid(input) as any).data,
    renderers: {
      svg: renderSvg((parseMermaid(input) as any).data),
      html: renderHtml((parseMermaid(input) as any).data),
      json: renderJson((parseMermaid(input) as any).data),
      mermaid: renderMermaid((parseMermaid(input) as any).data)
    }
  } : {
    source: input,
    error: (parseMermaid(input) as any).error
  };

// Type-safe rendering pipeline
const renderWithMultipleFormats = (ast: MermaidAST): Record<string, Result<string>> => ({
  svg: renderSvg(ast, { theme: "dark", width: 1000, height: 800 }),
  html: renderHtml(ast, { includeStyles: true, responsive: true }),
  json: renderJson(ast, { pretty: true, includeMetadata: true }),
  mermaid: renderMermaid(ast, { preserveFormatting: true })
});

// Analysis functions using pattern matching
const analyzeAST = (ast: MermaidAST) => {
  const nodeCount = ast.nodes.size;
  const edgeCount = ast.edges.length;

  const nodeShapes = Array.from(ast.nodes.values())
    .reduce((acc, node) => {
      acc[node.shape] = (acc[node.shape] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const edgeTypes = ast.edges
    .reduce((acc, edge) => {
      acc[edge.type] = (acc[edge.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const complexity = match(ast.diagramType)
    .with({ type: "flowchart" }, () =>
      nodeCount + (edgeCount * 0.5) // Flowcharts complexity factor
    )
    .otherwise(() => nodeCount + edgeCount);

  return {
    nodeCount,
    edgeCount,
    nodeShapes,
    edgeTypes,
    complexity: Math.round(complexity * 100) / 100,
    diagramType: ast.diagramType
  };
};

// Functional validation pipeline
const validateAST = (ast: MermaidAST): readonly string[] => {
  const errors: string[] = [];

  // Check for orphaned edges
  ast.edges.forEach(edge => {
    if (!ast.nodes.has(edge.from)) {
      errors.push(`Edge references non-existent node: ${edge.from}`);
    }
    if (!ast.nodes.has(edge.to)) {
      errors.push(`Edge references non-existent node: ${edge.to}`);
    }
  });

  // Check for isolated nodes
  const connectedNodes = new Set([
    ...ast.edges.map(e => e.from),
    ...ast.edges.map(e => e.to)
  ]);

  Array.from(ast.nodes.keys()).forEach(nodeId => {
    if (!connectedNodes.has(nodeId) && ast.nodes.size > 1) {
      errors.push(`Isolated node detected: ${nodeId}`);
    }
  });

  return errors;
};

// Advanced AST transformations
const transformAST = (ast: MermaidAST, transformer: (ast: MermaidAST) => MermaidAST) =>
  transformer(ast);

// Example transformations
const addMetadataTransformer = (ast: MermaidAST): MermaidAST => ({
  ...ast,
  metadata: new Map(ast.metadata.set("processedAt", new Date().toISOString()))
});

const normalizeLabelsTransformer = (ast: MermaidAST): MermaidAST => ({
  ...ast,
  nodes: new Map(
    Array.from(ast.nodes.entries()).map(([id, node]) => [
      id,
      { ...node, label: node.label.trim().toLowerCase() }
    ])
  )
});

// Compose transformations functionally
const compose = <T>(...fns: Array<(arg: T) => T>) =>
  (value: T) => fns.reduce((acc, fn) => fn(acc), value);

const enhanceAST = compose(
  addMetadataTransformer,
  normalizeLabelsTransformer
);

// Specialized test for zero-knowledge proof diagram
const testZKProofDiagram = () => {
  console.log("🔐 Zero-Knowledge Proof Diagram Test");
  console.log("─".repeat(50));

  const parseResult = parseMermaid(zkProofFlowchart);

  if (!parseResult.success) {
    console.log(`❌ ZK Proof Parse Error: ${parseResult.error}`);
    return false;
  }

  const ast = parseResult.data;
  const analysis = analyzeAST(ast);

  // Verify specific characteristics of ZK proof diagram
  const expectedNodes = ["TS", "P", "V", "P2", "V2", "V3", "A1", "A2"];
  const actualNodes = Array.from(ast.nodes.keys());

  const hasAllNodes = expectedNodes.every(nodeId => actualNodes.includes(nodeId));
  const hasDecisionNode = Array.from(ast.nodes.values()).some(node => node.shape === "rhombus");
  const hasConditionalEdges = ast.edges.some(edge => edge.label?.includes("valid"));

  console.log("✅ ZK Proof Diagram Analysis:");
  console.log(`  - Nodes: ${analysis.nodeCount} (expected: ${expectedNodes.length})`);
  console.log(`  - Edges: ${analysis.edgeCount}`);
  console.log(`  - Has all expected nodes: ${hasAllNodes}`);
  console.log(`  - Has decision node: ${hasDecisionNode}`);
  console.log(`  - Has conditional edges: ${hasConditionalEdges}`);
  console.log(`  - Complexity score: ${analysis.complexity}`);

  return hasAllNodes && hasDecisionNode && hasConditionalEdges;
};

// Demo execution function
const runDemo = () => {
  console.log("🎯 Mermaid Parser Demo - Functional TypeScript Architecture\n");

  // Test ZK proof diagram specifically
  const zkTestPassed = testZKProofDiagram();
  console.log(`\n🔐 ZK Proof Test: ${zkTestPassed ? "✅ PASSED" : "❌ FAILED"}\n`);

  // Parse all example diagrams
  const examples = [flowchartExample, complexFlowchart, zkProofFlowchart];

  examples.forEach((example, index) => {
    console.log(`📊 Diagram ${index + 1}:`);
    console.log("─".repeat(50));

    const parseResult = parseMermaid(example);

    if (!parseResult.success) {
      console.log(`❌ Parse Error: ${parseResult.error}\n`);
      return;
    }

    const ast = parseResult.data;

    // Analyze AST
    const analysis = analyzeAST(ast);
    console.log("📈 Analysis:", JSON.stringify(analysis, null, 2));

    // Validate AST
    const validationErrors = validateAST(ast);
    if (validationErrors.length > 0) {
      console.log("⚠️  Validation Issues:");
      validationErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log("✅ AST validation passed");
    }

    // Transform AST
    const enhancedAST = enhanceAST(ast);

    // Render in multiple formats
    const rendered = renderWithMultipleFormats(enhancedAST);

    console.log("\n🎨 Rendered Outputs:");
    Object.entries(rendered).forEach(([format, result]) => {
      if (result.success) {
        // Save SVG files to disk
        if (format === 'svg') {
          const filename = `diagram_${index + 1}.svg`;
          Deno.writeTextFileSync(filename, result.data);
          console.log(`  ${format.toUpperCase()}: Saved to ${filename}`);
        } else {
          const preview = result.data.length > 100
            ? result.data.substring(0, 100) + "..."
            : result.data;
          console.log(`  ${format.toUpperCase()}: ${preview.replace(/\n/g, " ")}`);
        }
      } else {
        console.log(`  ${format.toUpperCase()}: ❌ ${result.error}`);
      }
    });

    console.log("\n");
  });

  // Demonstrate extensibility
  console.log("🔧 Extensibility Demo:");
  console.log("─".repeat(50));

  // Custom renderer example
  const customRenderer = (ast: MermaidAST) => {
    const summary = `Diagram: ${ast.diagramType.type} | Nodes: ${ast.nodes.size} | Edges: ${ast.edges.length}`;
    return { success: true as const, data: summary };
  };

  const parseResult = parseMermaid(flowchartExample);
  if (parseResult.success) {
    const customOutput = customRenderer(parseResult.data);
    console.log("📄 Custom Renderer Output:", customOutput.data);
  }

  console.log("\n✨ Demo completed successfully!");
};

// Export for use in other modules
export {
  runDemo,
  testZKProofDiagram,
  processDiagram,
  renderWithMultipleFormats,
  analyzeAST,
  validateAST,
  transformAST,
  enhanceAST,
  compose
};

// Execute demo if running directly
if (import.meta.main) {
  runDemo();
}

// Example of how to extend with new diagram types
export const extendedDiagramParser = (input: string) => {
  // This demonstrates how the functional architecture
  // enables easy extension to new diagram types
  const baseResult = parseMermaid(input);

  if (!baseResult.success) {
    // Could attempt parsing as other diagram types here
    return baseResult;
  }

  return baseResult;
};

// Performance monitoring with functional composition
export const withPerformanceMonitoring = <T, R>(
  fn: (input: T) => R,
  label: string
) => (input: T): R => {
  const start = performance.now();
  const result = fn(input);
  const end = performance.now();
  console.log(`⏱️  ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
};

// Monitored parsing function
export const monitoredParseMermaid = withPerformanceMonitoring(
  parseMermaid,
  "Mermaid Parse"
);

// Type-safe configuration for different output targets
export type OutputTarget =
  | { readonly type: "web"; readonly interactive: boolean }
  | { readonly type: "print"; readonly format: "pdf" | "png" }
  | { readonly type: "api"; readonly version: string };

export const renderForTarget = (ast: MermaidAST, target: OutputTarget) =>
  match(target)
    .with({ type: "web" }, ({ interactive }) =>
      renderHtml(ast, {
        includeStyles: true,
        responsive: true,
        className: interactive ? "interactive" : "static"
      })
    )
    .with({ type: "print" }, ({ format }) =>
      format === "pdf"
        ? renderSvg(ast, { theme: "neutral" })
        : renderSvg(ast, { theme: "light" })
    )
    .with({ type: "api" }, () =>
      renderJson(ast, { pretty: false, includeMetadata: true })
    )
    .exhaustive();