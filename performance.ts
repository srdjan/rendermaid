import { parseMermaid } from "./parser.ts";
import { renderSvg, renderHtml, renderJson, renderMermaid } from "./renderers.ts";

// Performance testing utilities
export type BenchmarkResult = {
  readonly name: string;
  readonly iterations: number;
  readonly totalTime: number;
  readonly avgTime: number;
  readonly minTime: number;
  readonly maxTime: number;
  readonly opsPerSecond: number;
};

export const benchmark = async <T>(
  name: string,
  fn: () => T,
  iterations: number = 1000
): Promise<BenchmarkResult> => {
  const times: number[] = [];
  
  // Warm up
  for (let i = 0; i < 10; i++) {
    fn();
  }
  
  // Actual benchmarking
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / avgTime;
  
  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSecond
  };
};

// Test data generators
export const generateSimpleFlowchart = (nodeCount: number): string => {
  let diagram = "flowchart TD\n";
  
  // Generate nodes
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = String.fromCharCode(65 + i); // A, B, C, etc.
    diagram += `  ${nodeId}[Node ${i + 1}]\n`;
  }
  
  // Generate linear connections
  for (let i = 0; i < nodeCount - 1; i++) {
    const from = String.fromCharCode(65 + i);
    const to = String.fromCharCode(65 + i + 1);
    diagram += `  ${from} --> ${to}\n`;
  }
  
  return diagram;
};

export const generateComplexFlowchart = (nodeCount: number): string => {
  let diagram = "flowchart LR\n";
  
  // Generate nodes with different shapes
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = String.fromCharCode(65 + i);
    const shapes = ["[Rectangle]", "{Diamond}", "((Circle))", "([Stadium])"];
    const shape = shapes[i % shapes.length];
    diagram += `  ${nodeId}${shape.replace(/Rectangle|Diamond|Circle|Stadium/, `Node ${i + 1}`)}\n`;
  }
  
  // Generate more complex connections (branching and merging)
  for (let i = 0; i < nodeCount - 1; i++) {
    const from = String.fromCharCode(65 + i);
    const to = String.fromCharCode(65 + i + 1);
    
    if (i % 3 === 0 && i + 2 < nodeCount) {
      // Create branches
      const branch = String.fromCharCode(65 + i + 2);
      diagram += `  ${from} -->|Yes| ${to}\n`;
      diagram += `  ${from} -->|No| ${branch}\n`;
    } else {
      diagram += `  ${from} --> ${to}\n`;
    }
  }
  
  // Add some back-connections for complexity
  if (nodeCount > 5) {
    diagram += `  ${String.fromCharCode(65 + nodeCount - 1)} --> ${String.fromCharCode(65 + 2)}\n`;
  }
  
  return diagram;
};

// Test scenarios
export const performanceTests = async () => {
  console.log("🚀 Performance Baseline Tests\n");
  console.log("=" * 50);
  
  const results: BenchmarkResult[] = [];
  
  // Test 1: Simple parsing
  const simpleFlowchart = generateSimpleFlowchart(5);
  results.push(await benchmark(
    "Parse Simple Flowchart (5 nodes)",
    () => parseMermaid(simpleFlowchart),
    1000
  ));
  
  // Test 2: Complex parsing
  const complexFlowchart = generateComplexFlowchart(10);
  results.push(await benchmark(
    "Parse Complex Flowchart (10 nodes)",
    () => parseMermaid(complexFlowchart),
    1000
  ));
  
  // Test 3: Large diagram parsing
  const largeFlowchart = generateComplexFlowchart(25);
  results.push(await benchmark(
    "Parse Large Flowchart (25 nodes)",
    () => parseMermaid(largeFlowchart),
    500
  ));
  
  // Test 4: SVG rendering
  const parseResult = parseMermaid(complexFlowchart);
  if (parseResult.success) {
    const ast = parseResult.data;
    
    results.push(await benchmark(
      "Render to SVG (10 nodes)",
      () => renderSvg(ast),
      1000
    ));
    
    results.push(await benchmark(
      "Render to HTML (10 nodes)",
      () => renderHtml(ast),
      1000
    ));
    
    results.push(await benchmark(
      "Render to JSON (10 nodes)",
      () => renderJson(ast),
      1000
    ));
    
    results.push(await benchmark(
      "Render to Mermaid (10 nodes)",
      () => renderMermaid(ast),
      1000
    ));
  }
  
  // Test 5: Full pipeline
  results.push(await benchmark(
    "Full Pipeline: Parse + Render SVG",
    () => {
      const result = parseMermaid(complexFlowchart);
      if (result.success) {
        renderSvg(result.data);
      }
    },
    500
  ));
  
  // Test 6: Memory-intensive operations
  const veryLargeFlowchart = generateComplexFlowchart(50);
  results.push(await benchmark(
    "Parse Very Large Flowchart (50 nodes)",
    () => parseMermaid(veryLargeFlowchart),
    100
  ));
  
  // Display results
  console.log("\n📊 Performance Results:\n");
  console.log("Test Name".padEnd(35) + "Avg Time".padEnd(12) + "Ops/Sec".padEnd(12) + "Min/Max (ms)");
  console.log("-".repeat(70));
  
  results.forEach(result => {
    const avgTimeStr = `${result.avgTime.toFixed(2)}ms`;
    const opsSecStr = `${result.opsPerSecond.toFixed(0)}`;
    const minMaxStr = `${result.minTime.toFixed(1)}/${result.maxTime.toFixed(1)}`;
    
    console.log(
      result.name.padEnd(35) +
      avgTimeStr.padEnd(12) +
      opsSecStr.padEnd(12) +
      minMaxStr
    );
  });
  
  // Performance insights
  console.log("\n🔍 Performance Analysis:");
  
  const parseResults = results.filter(r => r.name.includes("Parse"));
  const renderResults = results.filter(r => r.name.includes("Render"));
  
  if (parseResults.length > 0) {
    const avgParseTime = parseResults.reduce((sum, r) => sum + r.avgTime, 0) / parseResults.length;
    console.log(`• Average parsing time: ${avgParseTime.toFixed(2)}ms`);
  }
  
  if (renderResults.length > 0) {
    const avgRenderTime = renderResults.reduce((sum, r) => sum + r.avgTime, 0) / renderResults.length;
    console.log(`• Average rendering time: ${avgRenderTime.toFixed(2)}ms`);
  }
  
  const slowestTest = results.reduce((slowest, current) => 
    current.avgTime > slowest.avgTime ? current : slowest
  );
  console.log(`• Slowest operation: ${slowestTest.name} (${slowestTest.avgTime.toFixed(2)}ms)`);
  
  const fastestTest = results.reduce((fastest, current) => 
    current.avgTime < fastest.avgTime ? current : fastest
  );
  console.log(`• Fastest operation: ${fastestTest.name} (${fastestTest.avgTime.toFixed(2)}ms)`);
  
  return results;
};

// Memory usage testing
export const memoryUsageTest = () => {
  console.log("\n💾 Memory Usage Analysis:");
  
  const testCases = [
    { name: "5 nodes", diagram: generateSimpleFlowchart(5) },
    { name: "10 nodes", diagram: generateComplexFlowchart(10) },
    { name: "25 nodes", diagram: generateComplexFlowchart(25) },
    { name: "50 nodes", diagram: generateComplexFlowchart(50) }
  ];
  
  testCases.forEach(testCase => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Parse and render multiple times
    for (let i = 0; i < 100; i++) {
      const parseResult = parseMermaid(testCase.diagram);
      if (parseResult.success) {
        renderSvg(parseResult.data);
      }
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryDiff = finalMemory - initialMemory;
    
    console.log(`• ${testCase.name}: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB delta`);
  });
};

// Scalability testing
export const scalabilityTest = async () => {
  console.log("\n📈 Scalability Analysis:");
  
  const nodeCounts = [5, 10, 15, 20, 30, 40, 50];
  const scalabilityResults: Array<{ nodes: number; parseTime: number; renderTime: number }> = [];
  
  for (const nodeCount of nodeCounts) {
    const diagram = generateComplexFlowchart(nodeCount);
    
    const parseResult = await benchmark(
      `Parse ${nodeCount} nodes`,
      () => parseMermaid(diagram),
      100
    );
    
    let renderTime = 0;
    const parseOnce = parseMermaid(diagram);
    if (parseOnce.success) {
      const renderResult = await benchmark(
        `Render ${nodeCount} nodes`,
        () => renderSvg(parseOnce.data),
        100
      );
      renderTime = renderResult.avgTime;
    }
    
    scalabilityResults.push({
      nodes: nodeCount,
      parseTime: parseResult.avgTime,
      renderTime
    });
  }
  
  console.log("Nodes".padEnd(8) + "Parse Time".padEnd(12) + "Render Time".padEnd(12) + "Total Time");
  console.log("-".repeat(40));
  
  scalabilityResults.forEach(result => {
    const parseStr = `${result.parseTime.toFixed(2)}ms`;
    const renderStr = `${result.renderTime.toFixed(2)}ms`;
    const totalStr = `${(result.parseTime + result.renderTime).toFixed(2)}ms`;
    
    console.log(
      result.nodes.toString().padEnd(8) +
      parseStr.padEnd(12) +
      renderStr.padEnd(12) +
      totalStr
    );
  });
  
  // Calculate growth rate
  const firstResult = scalabilityResults[0];
  const lastResult = scalabilityResults[scalabilityResults.length - 1];
  const nodeGrowth = lastResult.nodes / firstResult.nodes;
  const timeGrowth = (lastResult.parseTime + lastResult.renderTime) / (firstResult.parseTime + firstResult.renderTime);
  
  console.log(`\n• Complexity: ${nodeGrowth}x nodes → ${timeGrowth.toFixed(1)}x time`);
  console.log(`• Growth rate: ${timeGrowth < nodeGrowth ? "Sub-linear (good)" : timeGrowth === nodeGrowth ? "Linear" : "Super-linear (needs optimization)"}`);
  
  return scalabilityResults;
};

// Main performance test runner
export const runPerformanceTests = async () => {
  console.log("🎯 RenderMaid Performance Test Suite\n");
  
  const baselineResults = await performanceTests();
  
  if ((performance as any).memory) {
    memoryUsageTest();
  } else {
    console.log("\n💾 Memory usage testing not available in this environment");
  }
  
  const scalabilityResults = await scalabilityTest();
  
  console.log("\n✨ Performance testing completed!");
  
  return {
    baseline: baselineResults,
    scalability: scalabilityResults
  };
};

// Execute if running directly
if (import.meta.main) {
  await runPerformanceTests();
}