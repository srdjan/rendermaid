import { match } from "npm:ts-pattern@5.0.5";
import type {
  Result, MermaidAST, MermaidNode, MermaidEdge, DiagramType, NodeShape, ConnectionType
} from "./parser.ts";
import { Ok, Err, getNodeShapeSymbols } from "./parser.ts";

// Renderer configuration using discriminated unions
export type RenderFormat =
  | { readonly type: "svg"; readonly config: SvgConfig }
  | { readonly type: "html"; readonly config: HtmlConfig }
  | { readonly type: "json"; readonly config: JsonConfig }
  | { readonly type: "mermaid"; readonly config: MermaidConfig };

export type SvgConfig = {
  readonly width: number;
  readonly height: number;
  readonly nodeSpacing: number;
  readonly theme: "light" | "dark" | "neutral";
};

export type HtmlConfig = {
  readonly className?: string;
  readonly includeStyles: boolean;
  readonly responsive: boolean;
};

export type JsonConfig = {
  readonly pretty: boolean;
  readonly includeMetadata: boolean;
};

export type MermaidConfig = {
  readonly preserveFormatting: boolean;
  readonly includeComments: boolean;
};

// Renderer function type - pure transformation
export type Renderer<T> = (ast: MermaidAST, config: T) => Result<string>;

// Position calculation for layout (functional approach)
type Position = { readonly x: number; readonly y: number };
type Layout = ReadonlyMap<string, Position>;

const calculateFlowchartLayout = (ast: MermaidAST, config: SvgConfig): Layout => {
  const nodes = Array.from(ast.nodes.values());
  const edges = ast.edges;
  const layout = new Map<string, Position>();

  // Build adjacency information for better layout
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  nodes.forEach(node => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });
  
  edges.forEach(edge => {
    graph.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  });

  // Topological sort for layered layout
  const layers: string[][] = [];
  const queue = nodes.filter(node => inDegree.get(node.id) === 0).map(n => n.id);
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const currentLayer = [...queue];
    layers.push(currentLayer);
    queue.length = 0;
    
    currentLayer.forEach(nodeId => {
      visited.add(nodeId);
      graph.get(nodeId)?.forEach(neighbor => {
        const newInDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newInDegree);
        if (newInDegree === 0 && !visited.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    });
  }
  
  // Add remaining nodes (cycles or disconnected)
  const remainingNodes = nodes.filter(n => !visited.has(n.id)).map(n => n.id);
  if (remainingNodes.length > 0) {
    layers.push(remainingNodes);
  }

  // Position nodes in layers with better spacing
  const layerSpacing = config.nodeSpacing * 1.5;
  const nodeSpacing = config.nodeSpacing;
  
  layers.forEach((layer, layerIndex) => {
    const y = layerIndex * layerSpacing + 60; // Start with some margin
    const totalWidth = (layer.length - 1) * nodeSpacing;
    const startX = -totalWidth / 2 + config.width / 2;
    
    layer.forEach((nodeId, nodeIndex) => {
      layout.set(nodeId, {
        x: startX + nodeIndex * nodeSpacing,
        y: y
      });
    });
  });

  return layout;
};

// SVG Renderer using functional composition
const renderSvgNode = (node: MermaidNode, position: Position, theme: string): string => {
  const { x, y } = position;
  const [,] = getNodeShapeSymbols(node.shape);

  return match(node.shape)
    .with("rectangle", () =>
      `<rect x="${x - 40}" y="${y - 20}" width="80" height="40" 
             class="node-rect ${theme}" stroke="currentColor" fill="none"/>
       <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${node.label}</text>`
    )
    .with("circle", () =>
      `<circle cx="${x}" cy="${y}" r="30" 
              class="node-circle ${theme}" stroke="currentColor" fill="none"/>
       <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${node.label}</text>`
    )
    .with("rhombus", () =>
      `<polygon points="${x - 40},${y} ${x},${y - 20} ${x + 40},${y} ${x},${y + 20}" 
               class="node-rhombus ${theme}" stroke="currentColor" fill="none"/>
       <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${node.label}</text>`
    )
    .otherwise(() =>
      `<rect x="${x - 40}" y="${y - 20}" width="80" height="40" rx="5" 
             class="node-default ${theme}" stroke="currentColor" fill="none"/>
       <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${node.label}</text>`
    );
};

// Calculate connection points on node boundaries to avoid overlapping with node content
const getConnectionPoint = (fromPos: Position, toPos: Position, isStart: boolean): Position => {
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) return fromPos;
  
  // Node dimensions (rectangular bounds)
  const nodeWidth = 80;
  const nodeHeight = 40;
  const padding = 5; // Extra padding to ensure clear separation
  
  // Calculate unit vector
  const unitX = dx / distance;
  const unitY = dy / distance;
  
  const basePos = isStart ? fromPos : toPos;
  const direction = isStart ? 1 : -1;
  
  // Calculate intersection with rectangle boundary
  // Determine which edge of the rectangle to connect to based on direction
  let offsetX = 0;
  let offsetY = 0;
  
  const absUnitX = Math.abs(unitX);
  const absUnitY = Math.abs(unitY);
  
  // Determine if we're connecting to horizontal or vertical edge
  if (absUnitX > absUnitY) {
    // Connecting to left or right edge
    offsetX = direction * Math.sign(unitX) * (nodeWidth / 2 + padding);
    offsetY = direction * unitY * (nodeWidth / 2 + padding) / absUnitX;
  } else {
    // Connecting to top or bottom edge
    offsetY = direction * Math.sign(unitY) * (nodeHeight / 2 + padding);
    offsetX = direction * unitX * (nodeHeight / 2 + padding) / absUnitY;
  }
  
  return {
    x: basePos.x + offsetX,
    y: basePos.y + offsetY
  };
};

// Check if a line segment intersects with a node rectangle
const lineIntersectsNode = (
  lineStart: Position, 
  lineEnd: Position, 
  nodePos: Position, 
  nodeId: string,
  fromNodeId: string,
  toNodeId: string
): boolean => {
  // Don't check intersection with the source or target nodes
  if (nodeId === fromNodeId || nodeId === toNodeId) return false;
  
  const nodeWidth = 80;
  const nodeHeight = 40;
  const padding = 10; // Extra padding around nodes
  
  const nodeLeft = nodePos.x - nodeWidth/2 - padding;
  const nodeRight = nodePos.x + nodeWidth/2 + padding;
  const nodeTop = nodePos.y - nodeHeight/2 - padding;
  const nodeBottom = nodePos.y + nodeHeight/2 + padding;
  
  // Simple line-rectangle intersection check
  // Check if line passes through the expanded node rectangle
  const minX = Math.min(lineStart.x, lineEnd.x);
  const maxX = Math.max(lineStart.x, lineEnd.x);
  const minY = Math.min(lineStart.y, lineEnd.y);
  const maxY = Math.max(lineStart.y, lineEnd.y);
  
  return !(maxX < nodeLeft || minX > nodeRight || maxY < nodeTop || minY > nodeBottom);
};

// Generate a routed path that avoids intermediate nodes
const routeEdgePath = (
  fromPos: Position,
  toPos: Position,
  edge: MermaidEdge,
  layout: Layout
): Position[] => {
  const startPoint = getConnectionPoint(fromPos, toPos, true);
  const endPoint = getConnectionPoint(fromPos, toPos, false);
  
  // Check if direct path intersects any nodes
  const allNodes = Array.from(layout.entries());
  const hasIntersection = allNodes.some(([nodeId, nodePos]) => 
    lineIntersectsNode(startPoint, endPoint, nodePos, nodeId, edge.from, edge.to)
  );
  
  if (!hasIntersection) {
    // Direct path is clear
    return [startPoint, endPoint];
  }
  
  // Create a routed path using waypoints
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  
  // Determine routing strategy based on direction
  if (Math.abs(dx) > Math.abs(dy)) {
    // Primarily horizontal movement - route above or below
    const routeY = fromPos.y + (dy > 0 ? -60 : 60); // Route above if going down, below if going up
    const waypoint1 = { x: fromPos.x + dx * 0.2, y: routeY };
    const waypoint2 = { x: toPos.x - dx * 0.2, y: routeY };
    
    return [startPoint, waypoint1, waypoint2, endPoint];
  } else {
    // Primarily vertical movement - route to the side
    const routeX = fromPos.x + (dx > 0 ? -100 : 100); // Route left if going right, right if going left
    const waypoint1 = { x: routeX, y: fromPos.y + dy * 0.2 };
    const waypoint2 = { x: routeX, y: toPos.y - dy * 0.2 };
    
    return [startPoint, waypoint1, waypoint2, endPoint];
  }
};

const renderSvgEdge = (edge: MermaidEdge, layout: Layout): string => {
  const fromPos = layout.get(edge.from);
  const toPos = layout.get(edge.to);

  if (!fromPos || !toPos) return "";

  // Generate routed path
  const pathPoints = routeEdgePath(fromPos, toPos, edge, layout);
  
  const strokeDasharray = match(edge.type)
    .with("dotted", () => "5,5")
    .with("dashed", () => "10,5")
    .otherwise(() => "none");

  const strokeWidth = edge.type === "thick" ? "3" : "1";

  // Create path string for SVG
  const pathData = pathPoints.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Calculate arrow direction from last two points
  const secondLast = pathPoints[pathPoints.length - 2];
  const last = pathPoints[pathPoints.length - 1];
  const dx = last.x - secondLast.x;
  const dy = last.y - secondLast.y;
  const angle = Math.atan2(dy, dx);
  const arrowLength = 8;
  
  const arrowX1 = last.x - arrowLength * Math.cos(angle - Math.PI / 6);
  const arrowY1 = last.y - arrowLength * Math.sin(angle - Math.PI / 6);
  const arrowX2 = last.x - arrowLength * Math.cos(angle + Math.PI / 6);
  const arrowY2 = last.y - arrowLength * Math.sin(angle + Math.PI / 6);

  // Position label at the midpoint of the path
  const midIndex = Math.floor(pathPoints.length / 2);
  const labelPos = pathPoints[midIndex];
  const edgeLabelElement = edge.label ? 
    `<text x="${labelPos.x}" y="${labelPos.y - 5}" 
           text-anchor="middle" font-size="10" fill="currentColor" 
           class="edge-label">${edge.label}</text>` : "";

  return `<path d="${pathData}" 
               stroke="currentColor" 
               stroke-width="${strokeWidth}"
               stroke-dasharray="${strokeDasharray}"
               fill="none"/>
          ${edge.type === "arrow" ?
      `<polygon points="${last.x},${last.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}" 
                     fill="currentColor"/>` : ""}
          ${edgeLabelElement}`;
};

export const svgRenderer: Renderer<SvgConfig> = (ast, config) => {
  const layout = calculateFlowchartLayout(ast, config);
  const nodes = Array.from(ast.nodes.values());

  const svgNodes = nodes
    .map(node => {
      const pos = layout.get(node.id);
      return pos ? renderSvgNode(node, pos, config.theme) : "";
    })
    .filter(Boolean)
    .join("\n  ");

  const svgEdges = ast.edges
    .map(edge => renderSvgEdge(edge, layout))
    .filter(Boolean)
    .join("\n  ");

  const svg = `<svg width="${config.width}" height="${config.height}" 
                   viewBox="0 0 ${config.width} ${config.height}"
                   xmlns="http://www.w3.org/2000/svg"
                   style="background-color: white;">
  <style>
    .node-rect, .node-circle, .node-rhombus, .node-default { 
      stroke-width: 2; 
    }
    .light { color: #333; }
    .dark { color: #333; }
    .neutral { color: #666; }
    text { font-family: sans-serif; font-size: 12px; fill: #333; }
    .edge-label { 
      font-size: 10px; 
      fill: #333;
      text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white;
    }
  </style>
  ${svgNodes}
  ${svgEdges}
</svg>`;

  return Ok(svg);
};

// HTML Renderer with Web Components approach
export const htmlRenderer: Renderer<HtmlConfig> = (ast, config) => {
  const { diagramType } = ast;
  const nodes = Array.from(ast.nodes.values());

  const nodeElements = nodes
    .map(node =>
      `<div class="mermaid-node mermaid-node-${node.shape}" data-id="${node.id}">
         ${node.label}
       </div>`
    )
    .join("\n    ");

  const edgeElements = ast.edges
    .map(edge =>
      `<div class="mermaid-edge mermaid-edge-${edge.type}" 
            data-from="${edge.from}" data-to="${edge.to}">
         ${edge.label || ""}
       </div>`
    )
    .join("\n    ");

  const styles = config.includeStyles ? `
  <style>
    .mermaid-diagram { 
      display: grid; 
      gap: 1rem; 
      ${config.responsive ? "container-type: inline-size;" : ""}
    }
    .mermaid-node { 
      padding: 0.5rem; 
      border: 1px solid currentColor; 
      border-radius: 0.25rem; 
      text-align: center; 
    }
    .mermaid-node-circle { border-radius: 50%; }
    .mermaid-node-rhombus { transform: rotate(45deg); }
    .mermaid-edge { 
      position: relative; 
      font-size: 0.875rem; 
      color: #666; 
    }
  </style>` : "";

  const html = `${styles}
<div class="mermaid-diagram ${config.className || ""}" 
     data-diagram-type="${diagramType.type}">
  <div class="mermaid-nodes">
    ${nodeElements}
  </div>
  <div class="mermaid-edges">
    ${edgeElements}
  </div>
</div>`;

  return Ok(html);
};

// JSON Renderer for data exchange
export const jsonRenderer: Renderer<JsonConfig> = (ast, config) => {
  const serializable = {
    diagramType: ast.diagramType,
    nodes: Object.fromEntries(
      Array.from(ast.nodes.entries()).map(([id, node]) => [
        id,
        config.includeMetadata ? node : { id: node.id, label: node.label, shape: node.shape }
      ])
    ),
    edges: ast.edges.map(edge =>
      config.includeMetadata ? edge : { from: edge.from, to: edge.to, type: edge.type, label: edge.label }
    ),
    ...(config.includeMetadata && { metadata: Object.fromEntries(ast.metadata) })
  };

  const json = config.pretty
    ? JSON.stringify(serializable, null, 2)
    : JSON.stringify(serializable);

  return Ok(json);
};

// Mermaid Renderer (round-trip)
export const mermaidRenderer: Renderer<MermaidConfig> = (ast, config) => {
  const { diagramType } = ast;

  const header = match(diagramType)
    .with({ type: "flowchart" }, (d) => `flowchart ${d.direction}`)
    .otherwise(() => diagramType.type);

  const nodes = Array.from(ast.nodes.values())
    .map(node => {
      const [open, close] = getNodeShapeSymbols(node.shape);
      return `  ${node.id}${open}${node.label}${close}`;
    })
    .join("\n");

  const edges = ast.edges
    .map(edge => {
      const connector = match(edge.type)
        .with("arrow", () => "-->")
        .with("line", () => "---")
        .with("thick", () => "==>")
        .with("dotted", () => "-.->")
        .with("dashed", () => "---")
        .exhaustive();

      const label = edge.label ? `|${edge.label}|` : "";
      return `  ${edge.from} ${connector}${label} ${edge.to}`;
    })
    .join("\n");

  const mermaid = `${header}\n${nodes}\n${edges}`;
  return Ok(mermaid);
};

// Universal render function using pattern matching
export const render = (ast: MermaidAST, format: RenderFormat): Result<string> =>
  match(format)
    .with({ type: "svg" }, ({ config }) => svgRenderer(ast, config))
    .with({ type: "html" }, ({ config }) => htmlRenderer(ast, config))
    .with({ type: "json" }, ({ config }) => jsonRenderer(ast, config))
    .with({ type: "mermaid" }, ({ config }) => mermaidRenderer(ast, config))
    .exhaustive();

// Convenience functions for common render configurations
export const renderSvg = (ast: MermaidAST, config?: Partial<SvgConfig>) =>
  render(ast, {
    type: "svg",
    config: {
      width: 800,
      height: 600,
      nodeSpacing: 120,
      theme: "light",
      ...config
    }
  });

export const renderHtml = (ast: MermaidAST, config?: Partial<HtmlConfig>) =>
  render(ast, {
    type: "html",
    config: {
      includeStyles: true,
      responsive: true,
      ...config
    }
  });

export const renderJson = (ast: MermaidAST, config?: Partial<JsonConfig>) =>
  render(ast, {
    type: "json",
    config: {
      pretty: true,
      includeMetadata: false,
      ...config
    }
  });

export const renderMermaid = (ast: MermaidAST, config?: Partial<MermaidConfig>) =>
  render(ast, {
    type: "mermaid",
    config: {
      preserveFormatting: true,
      includeComments: false,
      ...config
    }
  });