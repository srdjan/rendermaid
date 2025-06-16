// Optimized version of main.ts using the optimized parser and renderer
import { optimizedParseMermaid } from "./optimized-parser.ts";
import { optimizedSvgRenderer } from "./optimized-renderers.ts";

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

// Optimized demo function
const runOptimizedDemo = () => {
  console.log("🚀 Optimized Mermaid Parser Demo\n");

  const examples = [flowchartExample, complexFlowchart];

  examples.forEach((example, index) => {
    console.log(`📊 Diagram ${index + 1}:`);
    console.log("─".repeat(50));

    const parseStart = performance.now();
    const parseResult = optimizedParseMermaid(example);
    const parseEnd = performance.now();

    if (!parseResult.success) {
      console.log(`❌ Parse Error: ${parseResult.error}\n`);
      return;
    }

    const ast = parseResult.data;
    console.log(`⚡ Parsed in ${(parseEnd - parseStart).toFixed(2)}ms`);

    // Render with optimized renderer
    const renderStart = performance.now();
    const svgResult = optimizedSvgRenderer(ast, { 
      width: 1000, 
      height: 800, 
      nodeSpacing: 120, 
      theme: "dark" 
    });
    const renderEnd = performance.now();

    if (svgResult.success) {
      const filename = `optimized_diagram_${index + 1}.svg`;
      Deno.writeTextFileSync(filename, svgResult.data);
      console.log(`🎨 Rendered to ${filename} in ${(renderEnd - renderStart).toFixed(2)}ms`);
    }

    console.log(`📈 Total time: ${(parseEnd - parseStart + renderEnd - renderStart).toFixed(2)}ms`);
    console.log(`🔢 Nodes: ${ast.nodes.size}, Edges: ${ast.edges.length}\n`);
  });

  console.log("✨ Optimized demo completed!");
};

// Execute optimized demo
if (import.meta.main) {
  runOptimizedDemo();
}