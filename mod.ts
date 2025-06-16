/**
 * RenderMaid - High-performance, functional TypeScript library for parsing and rendering Mermaid diagrams
 * 
 * @module
 */

// Core parser exports
export {
  parseMermaid,
  type Result,
  type MermaidAST,
  type MermaidNode,
  type MermaidEdge,
  type DiagramType,
  type NodeShape,
  type ConnectionType,
  type FlowchartDirection,
  createNode,
  createEdge,
  createAST,
  addNode,
  addEdge,
  getNodeShapeSymbols,
  Ok,
  Err
} from "./parser.ts";

// Renderer exports
export {
  renderSvg,
  renderHtml,
  renderJson,
  renderMermaid,
  render,
  svgRenderer,
  htmlRenderer,
  jsonRenderer,
  mermaidRenderer,
  type RenderFormat,
  type SvgConfig,
  type HtmlConfig,
  type JsonConfig,
  type MermaidConfig,
  type Renderer
} from "./renderers.ts";

// Utility functions for analysis and validation
export {
  analyzeAST,
  validateAST,
  transformAST,
  enhanceAST,
  compose,
  withPerformanceMonitoring,
  renderForTarget,
  type OutputTarget
} from "./main.ts";