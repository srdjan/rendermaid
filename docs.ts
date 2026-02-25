/**
 * @fileoverview Documentation and examples for RenderMaid library
 * 
 * This file provides comprehensive documentation, examples, and usage patterns
 * for the RenderMaid Mermaid diagram processing library.
 * 
 * @module docs
 * @version 0.7.0
 * @author Srdjan & Clody
 * @since 0.0.1
 */

/**
 * @example Quick Start - Basic diagram parsing and rendering
 * ```typescript
 * import { parseMermaid, renderSvg } from "@srdjan/rendermaid";
 * 
 * // Define a simple flowchart
 * const diagram = `
 * flowchart TD
 *   A[Start] --> B{Decision}
 *   B -->|Yes| C[Process]
 *   B -->|No| D[Skip]
 *   C --> E[End]
 *   D --> E
 * `;
 * 
 * // Parse the diagram
 * const parseResult = parseMermaid(diagram);
 * 
 * if (parseResult.success) {
 *   // Render to SVG with custom styling
 *   const svgResult = renderSvg(parseResult.data, {
 *     width: 800,
 *     height: 600,
 *     theme: "light",
 *     nodeSpacing: 120
 *   });
 *   
 *   if (svgResult.success) {
 *     console.log("SVG generated:", svgResult.data.length, "characters");
 *   }
 * }
 * ```
 */

/**
 * @example Multi-format rendering - Generate multiple output formats
 * ```typescript
 * import { 
 *   parseMermaid, 
 *   renderSvg, 
 *   renderHtml, 
 *   renderJson, 
 *   renderMermaid 
 * } from "@srdjan/rendermaid";
 * 
 * const diagram = `
 * flowchart LR
 *   A([User Input]) --> B{Validate}
 *   B -->|Valid| C[Process Data]
 *   B -->|Invalid| D[Show Error]
 *   C --> E[(Database)]
 *   E --> F[Generate Report]
 * `;
 * 
 * const parseResult = parseMermaid(diagram);
 * 
 * if (parseResult.success) {
 *   const ast = parseResult.data;
 *   
 *   // Generate multiple formats
 *   const svg = renderSvg(ast, { theme: "dark" });
 *   const html = renderHtml(ast, { includeStyles: true, responsive: true });
 *   const json = renderJson(ast, { pretty: true, includeMetadata: true });
 *   const mermaid = renderMermaid(ast, { preserveFormatting: true });
 *   
 *   console.log("Generated formats:", {
 *     svg: svg.success,
 *     html: html.success, 
 *     json: json.success,
 *     mermaid: mermaid.success
 *   });
 * }
 * ```
 */

/**
 * @example Advanced analysis - Diagram validation and complexity analysis
 * ```typescript
 * import { 
 *   parseMermaid, 
 *   validateAST, 
 *   analyzeAST, 
 *   enhanceAST,
 *   transformAST 
 * } from "@srdjan/rendermaid";
 * 
 * const complexDiagram = `
 * flowchart TD
 *   A[Start] --> B{Check Input}
 *   B -->|Valid| C[Process]
 *   B -->|Invalid| D[Error]
 *   C --> E{More Data?}
 *   E -->|Yes| F[Load More]
 *   E -->|No| G[Finish]
 *   F --> C
 *   D --> H[Log Error]
 *   H --> G
 * `;
 * 
 * const parseResult = parseMermaid(complexDiagram);
 * 
 * if (parseResult.success) {
 *   let ast = parseResult.data;
 *   
 *   // Validate diagram integrity
 *   const validationErrors = validateAST(ast);
 *   console.log("Validation:", validationErrors.length === 0 ? "✓ Valid" : "✗ Issues found");
 *   
 *   // Analyze complexity and structure
 *   const analysis = analyzeAST(ast);
 *   console.log("Analysis:", {
 *     complexity: analysis.complexity,
 *     nodes: Object.keys(analysis.nodeShapes),
 *     hasCycles: analysis.cycleDetected,
 *     depth: analysis.depth
 *   });
 *   
 *   // Add custom metadata
 *   ast = enhanceAST(ast);
 *   
 *   // Custom transformation - add timestamps
 *   ast = transformAST(ast, (ast) => ({
 *     ...ast,
 *     metadata: new Map([
 *       ...ast.metadata,
 *       ['processedAt', new Date().toISOString()],
 *       ['complexity', analysis.complexity]
 *     ])
 *   }));
 * }
 * ```
 */

/**
 * @example Performance monitoring - Track rendering performance
 * ```typescript
 * import { 
 *   parseMermaid, 
 *   renderSvg, 
 *   withPerformanceMonitoring 
 * } from "@srdjan/rendermaid";
 * 
 * // Create performance-monitored functions
 * const timedParse = withPerformanceMonitoring(parseMermaid, "Parse");
 * const timedRender = withPerformanceMonitoring(
 *   (ast) => renderSvg(ast, { theme: "light" }), 
 *   "SVG Render"
 * );
 * 
 * const diagram = `
 * flowchart TD
 *   A[Start] --> B[Step 1]
 *   B --> C[Step 2] 
 *   C --> D[Step 3]
 *   D --> E[End]
 * `;
 * 
 * // Execute with performance tracking
 * const parseResult = timedParse(diagram);
 * 
 * if (parseResult.success) {
 *   const svgResult = timedRender(parseResult.data);
 *   // Console output will show timing information
 * }
 * ```
 */

/**
 * @example Error handling - Robust error management
 * ```typescript
 * import { parseMermaid, renderSvg, type Result } from "@srdjan/rendermaid";
 * 
 * function processUserDiagram(input: string): Result<string> {
 *   // Parse with error handling
 *   const parseResult = parseMermaid(input);
 *   
 *   if (!parseResult.success) {
 *     return {
 *       success: false,
 *       error: `Parse failed: ${parseResult.error}`
 *     };
 *   }
 *   
 *   // Render with error handling
 *   const renderResult = renderSvg(parseResult.data);
 *   
 *   if (!renderResult.success) {
 *     return {
 *       success: false,
 *       error: `Render failed: ${renderResult.error}`
 *     };
 *   }
 *   
 *   return {
 *     success: true,
 *     data: renderResult.data
 *   };
 * }
 * 
 * // Usage with error handling
 * const result = processUserDiagram("invalid diagram syntax");
 * 
 * if (result.success) {
 *   console.log("SVG generated successfully");
 * } else {
 *   console.error("Processing failed:", result.error);
 * }
 * ```
 */

/**
 * @example Functional composition - Combine operations elegantly
 * ```typescript
 * import { 
 *   parseMermaid, 
 *   renderSvg, 
 *   analyzeAST, 
 *   compose,
 *   type MermaidAST 
 * } from "@srdjan/rendermaid";
 * 
 * // Create reusable transformation functions
 * const addTimestamp = (ast: MermaidAST): MermaidAST => ({
 *   ...ast,
 *   metadata: new Map([
 *     ...ast.metadata,
 *     ['timestamp', Date.now()]
 *   ])
 * });
 * 
 * const addComplexityScore = (ast: MermaidAST): MermaidAST => {
 *   const analysis = analyzeAST(ast);
 *   return {
 *     ...ast,
 *     metadata: new Map([
 *       ...ast.metadata, 
 *       ['complexity', analysis.complexity]
 *     ])
 *   };
 * };
 * 
 * // Compose transformations
 * const enhanceAST = compose(addComplexityScore, addTimestamp);
 * 
 * // Process diagram with composed enhancements
 * const diagram = "flowchart TD\n  A --> B --> C";
 * const parseResult = parseMermaid(diagram);
 * 
 * if (parseResult.success) {
 *   const enhancedAST = enhanceAST(parseResult.data);
 *   const svgResult = renderSvg(enhancedAST);
 * }
 * ```
 */

/**
 * @example Custom node shapes and styling
 * ```typescript
 * import { 
 *   createNode, 
 *   createEdge, 
 *   createAST, 
 *   addNode, 
 *   addEdge,
 *   renderSvg 
 * } from "@srdjan/rendermaid";
 * 
 * // Build AST programmatically with different node shapes
 * let ast = createAST({ type: "flowchart", direction: "LR" });
 * 
 * // Add nodes with various shapes
 * const startNode = createNode("start", "Begin Process", "stadium");
 * const decisionNode = createNode("decision", "Check Condition", "rhombus"); 
 * const processNode = createNode("process", "Execute Action", "rectangle");
 * const endNode = createNode("end", "Complete", "circle");
 * 
 * ast = addNode(ast, startNode);
 * ast = addNode(ast, decisionNode);
 * ast = addNode(ast, processNode);
 * ast = addNode(ast, endNode);
 * 
 * // Connect with labeled edges
 * const edges = [
 *   createEdge("start", "decision", "arrow"),
 *   createEdge("decision", "process", "arrow", "Yes"),
 *   createEdge("decision", "end", "arrow", "No"),
 *   createEdge("process", "end", "arrow")
 * ];
 * 
 * for (const edge of edges) {
 *   ast = addEdge(ast, edge);
 * }
 * 
 * // Render with custom styling
 * const svgResult = renderSvg(ast, {
 *   width: 1000,
 *   height: 400,
 *   theme: "neutral",
 *   nodeSpacing: 180
 * });
 * ```
 */

// Re-export all functionality for documentation purposes
export * from "./mod.ts";