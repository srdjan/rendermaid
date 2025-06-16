import { generateComplexFlowchart } from "./performance.ts";
import { parseMermaid } from "./parser.ts";
import { optimizedParseMermaid, compareParserPerformance } from "./optimized-parser.ts";
import { compareRendererPerformance } from "./optimized-renderers.ts";

console.log("⚡ Performance Optimization Comparison\n");

// Test different diagram sizes
const testSizes = [10, 25, 50];

for (const size of testSizes) {
  console.log(`\n📊 Testing with ${size} nodes:`);
  console.log("=" .repeat(40));
  
  const diagram = generateComplexFlowchart(size);
  
  // Test parser performance
  await compareParserPerformance(diagram, 500);
  
  // Test renderer performance
  const parseResult = parseMermaid(diagram);
  if (parseResult.success) {
    const ast = parseResult.data;
    const config = {
      width: 1000,
      height: 800,
      nodeSpacing: 120,
      theme: "dark" as const
    };
    
    await compareRendererPerformance(ast, config, 500);
  }
  
  console.log();
}

console.log("✨ Performance comparison completed!");