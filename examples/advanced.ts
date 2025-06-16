/**
 * Advanced RenderMaid usage examples
 */

import { 
  parseMermaid, 
  renderSvg, 
  analyzeAST, 
  validateAST,
  transformAST,
  type MermaidAST 
} from "../mod.ts";

// Complex flowchart with multiple shapes and connections
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

console.log("🚀 Advanced RenderMaid Example\n");

// Parse and analyze
const parseResult = parseMermaid(complexFlowchart);

if (parseResult.success) {
  const ast = parseResult.data;
  
  // Analyze the diagram
  const analysis = analyzeAST(ast);
  console.log("📈 Diagram Analysis:");
  console.log(`  Complexity Score: ${analysis.complexity}`);
  console.log(`  Node Shapes: ${JSON.stringify(analysis.nodeShapes)}`);
  console.log(`  Edge Types: ${JSON.stringify(analysis.edgeTypes)}`);
  
  // Validate the AST
  const validationErrors = validateAST(ast);
  if (validationErrors.length === 0) {
    console.log("✅ AST validation passed");
  } else {
    console.log("⚠️ Validation issues:", validationErrors);
  }
  
  // Custom transformation example
  const addTimestampTransformer = (ast: MermaidAST): MermaidAST => ({
    ...ast,
    metadata: new Map(ast.metadata.set("processedAt", new Date().toISOString()))
  });
  
  const enhancedAST = transformAST(ast, addTimestampTransformer);
  console.log("🔄 Applied custom transformation");
  
  // Render with different configurations
  const configs = [
    { theme: "light" as const, name: "Light Theme" },
    { theme: "dark" as const, name: "Dark Theme" },
    { theme: "neutral" as const, name: "Neutral Theme" }
  ];
  
  configs.forEach(({ theme, name }) => {
    const result = renderSvg(enhancedAST, {
      width: 1000,
      height: 600,
      theme,
      nodeSpacing: 150
    });
    
    if (result.success) {
      console.log(`🎨 ${name} SVG generated (${result.data.length} chars)`);
    }
  });
  
  // Performance monitoring example
  const { withPerformanceMonitoring } = await import("../main.ts");
  
  const monitoredRender = withPerformanceMonitoring(
    (ast: MermaidAST) => renderSvg(ast, { theme: "light" }),
    "SVG Render"
  );
  
  console.log("\n⏱️ Performance Test:");
  const timedResult = monitoredRender(ast);
  
} else {
  console.error("❌ Parse error:", parseResult.error);
}