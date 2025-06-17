/**
 * RenderMaid - High-performance, functional TypeScript library for parsing and rendering Mermaid diagrams
 * 
 * @example Basic usage
 * ```typescript
 * import { parseMermaid, renderSvg } from "@rendermaid/core";
 * 
 * const diagram = `
 * flowchart TD
 *   A[Start] --> B{Decision}
 *   B -->|Yes| C[Process]
 *   B -->|No| D[Skip]
 * `;
 * 
 * const parseResult = parseMermaid(diagram);
 * if (parseResult.success) {
 *   const svgResult = renderSvg(parseResult.data, {
 *     theme: "light",
 *     width: 800,
 *     height: 600
 *   });
 *   console.log(svgResult.data); // SVG string
 * }
 * ```
 * 
 * @example Advanced usage with analysis
 * ```typescript
 * import { parseMermaid, analyzeAST, validateAST, renderSvg } from "@rendermaid/core";
 * 
 * const result = parseMermaid(diagram);
 * if (result.success) {
 *   const ast = result.data;
 *   
 *   // Validate diagram integrity
 *   const errors = validateAST(ast);
 *   console.log("Validation errors:", errors);
 *   
 *   // Analyze complexity
 *   const analysis = analyzeAST(ast);
 *   console.log("Complexity:", analysis.complexity);
 *   
 *   // Render with optimizations
 *   const svg = renderSvg(ast, { theme: "dark" });
 * }
 * ```
 * 
 * @module
 * @version 0.0.3
 * @author RenderMaid Team
 * @license MIT
 */

/**
 * Core parsing functionality for Mermaid diagrams
 * @namespace Parser
 */
export {
  /** Parse Mermaid diagram string into AST */
  parseMermaid,
  /** Result type for operations that can fail */
  type Result,
  /** Complete Abstract Syntax Tree representation */
  type MermaidAST,
  /** Individual node in the diagram */
  type MermaidNode,
  /** Connection between nodes */
  type MermaidEdge,
  /** Supported diagram types */
  type DiagramType,
  /** Available node shapes */
  type NodeShape,
  /** Connection line types */
  type ConnectionType,
  /** Flowchart layout directions */
  type FlowchartDirection,
  /** Create a new diagram node */
  createNode,
  /** Create a new edge connection */
  createEdge,
  /** Create empty AST structure */
  createAST,
  /** Add node to existing AST */
  addNode,
  /** Add edge to existing AST */
  addEdge,
  /** Get available shape symbols */
  getNodeShapeSymbols,
  /** Create successful result */
  Ok,
  /** Create error result */
  Err
} from "./lib/parser.ts";

/**
 * Multi-format rendering engines
 * @namespace Renderers
 */
export {
  /** Render AST to SVG format */
  renderSvg,
  /** Render AST to HTML format */
  renderHtml,
  /** Export AST to JSON format */
  renderJson,
  /** Convert AST back to Mermaid syntax */
  renderMermaid,
  /** Generic render function */
  render,
  /** Direct SVG renderer */
  svgRenderer,
  /** Direct HTML renderer */
  htmlRenderer,
  /** Direct JSON renderer */
  jsonRenderer,
  /** Direct Mermaid renderer */
  mermaidRenderer,
  /** Render format configuration */
  type RenderFormat,
  /** SVG rendering options */
  type SvgConfig,
  /** HTML rendering options */
  type HtmlConfig,
  /** JSON export options */
  type JsonConfig,
  /** Mermaid output options */
  type MermaidConfig,
  /** Generic renderer interface */
  type Renderer
} from "./lib/renderers.ts";

/**
 * Analysis, validation, and utility functions
 * @namespace Utils
 */
export {
  /** Analyze AST complexity and structure */
  analyzeAST,
  /** Validate AST integrity */
  validateAST,
  /** Transform AST with custom function */
  transformAST,
  /** Add metadata to AST */
  enhanceAST,
  /** Functional composition utility */
  compose,
  /** Performance monitoring wrapper */
  withPerformanceMonitoring,
  /** Render for specific output target */
  renderForTarget,
  /** Output target type */
  type OutputTarget
} from "./lib/utils.ts";