/**
 * Basic RenderMaid usage examples
 */

import { parseMermaid, renderSvg, renderHtml, renderJson } from "../mod.ts";

// Basic flowchart example
const basicFlowchart = `
flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process A]
  B -->|No| D[Process B]
  C --> E[End]
  D --> E[End]
`;

console.log("🎯 Basic RenderMaid Example\n");

// Parse the diagram
const parseResult = parseMermaid(basicFlowchart);

if (parseResult.success) {
  const ast = parseResult.data;
  
  console.log(`✅ Parsed successfully: ${ast.nodes.size} nodes, ${ast.edges.length} edges`);
  
  // Render to different formats
  const svgResult = renderSvg(ast, { 
    width: 800, 
    height: 600, 
    theme: "light" 
  });
  
  const htmlResult = renderHtml(ast, { 
    includeStyles: true, 
    responsive: true 
  });
  
  const jsonResult = renderJson(ast, { 
    pretty: true, 
    includeMetadata: false 
  });
  
  if (svgResult.success) {
    console.log("📊 SVG generated successfully");
    // In a real app, you might save this to a file
    // await Deno.writeTextFile("diagram.svg", svgResult.data);
  }
  
  if (htmlResult.success) {
    console.log("🌐 HTML generated successfully");
  }
  
  if (jsonResult.success) {
    console.log("📄 JSON exported successfully");
    console.log("Sample JSON:", JSON.parse(jsonResult.data));
  }
  
} else {
  console.error("❌ Parse error:", parseResult.error);
}