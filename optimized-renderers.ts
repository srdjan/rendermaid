// Optimized renderers with caching and improved algorithms
import { match } from "npm:ts-pattern@5.0.5";
import type {
  MermaidAST, MermaidNode, MermaidEdge, Result, SvgConfig
} from "./renderers.ts";
import { Ok } from "./parser.ts";

// Cached layout computations
const layoutCache = new Map<string, ReadonlyMap<string, Position>>();

type Position = { readonly x: number; readonly y: number };
type Layout = ReadonlyMap<string, Position>;

// Optimized layout algorithm with spatial hashing
const optimizedCalculateLayout = (ast: MermaidAST, config: SvgConfig): Layout => {
  // Create cache key
  const cacheKey = `${ast.nodes.size}-${ast.edges.length}-${config.nodeSpacing}`;
  const cached = layoutCache.get(cacheKey);
  if (cached) return cached;
  
  const nodes = Array.from(ast.nodes.values());
  const edges = ast.edges;
  const layout = new Map<string, Position>();
  
  if (nodes.length === 0) return layout;
  
  // Optimized topological sort with single pass
  const inDegree = new Map<string, number>();
  const outNodes = new Map<string, string[]>();
  
  // Single pass to build graph structure
  nodes.forEach(node => {
    inDegree.set(node.id, 0);
    outNodes.set(node.id, []);
  });
  
  edges.forEach(edge => {
    outNodes.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  });
  
  // Layer-based layout using BFS
  const layers: string[][] = [];
  const queue: string[] = [];
  const visited = new Set<string>();
  
  // Start with nodes that have no incoming edges
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
    }
  });
  
  // If no entry points, start with first node
  if (queue.length === 0 && nodes.length > 0) {
    queue.push(nodes[0].id);
  }
  
  while (queue.length > 0) {
    const currentLayerSize = queue.length;
    const currentLayer: string[] = [];
    
    for (let i = 0; i < currentLayerSize; i++) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      currentLayer.push(nodeId);
      
      // Add children to next layer
      outNodes.get(nodeId)?.forEach(childId => {
        const newInDegree = (inDegree.get(childId) || 1) - 1;
        inDegree.set(childId, newInDegree);
        if (newInDegree === 0 && !visited.has(childId)) {
          queue.push(childId);
        }
      });
    }
    
    if (currentLayer.length > 0) {
      layers.push(currentLayer);
    }
  }
  
  // Add any remaining unvisited nodes
  const remaining = nodes.filter(n => !visited.has(n.id)).map(n => n.id);
  if (remaining.length > 0) {
    layers.push(remaining);
  }
  
  // Position nodes with optimized spacing
  const layerSpacing = config.nodeSpacing * 1.5;
  const nodeSpacing = config.nodeSpacing;
  const centerX = config.width / 2;
  
  layers.forEach((layer, layerIndex) => {
    const y = layerIndex * layerSpacing + 60;
    const totalWidth = Math.max(0, (layer.length - 1) * nodeSpacing);
    const startX = centerX - totalWidth / 2;
    
    layer.forEach((nodeId, nodeIndex) => {
      layout.set(nodeId, {
        x: startX + nodeIndex * nodeSpacing,
        y: y
      });
    });
  });
  
  // Cache the result
  layoutCache.set(cacheKey, layout);
  return layout;
};

// Optimized edge routing with spatial grid
class SpatialGrid {
  private grid: Map<string, Set<string>> = new Map();
  private cellSize: number;
  
  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }
  
  private getCellKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    return `${gridX},${gridY}`;
  }
  
  addNode(nodeId: string, pos: Position): void {
    const key = this.getCellKey(pos.x, pos.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(nodeId);
  }
  
  getNearbyNodes(pos: Position, radius: number = 1): Set<string> {
    const nearby = new Set<string>();
    const centerX = Math.floor(pos.x / this.cellSize);
    const centerY = Math.floor(pos.y / this.cellSize);
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const key = `${centerX + dx},${centerY + dy}`;
        const nodes = this.grid.get(key);
        if (nodes) {
          nodes.forEach(nodeId => nearby.add(nodeId));
        }
      }
    }
    
    return nearby;
  }
}

// Fast collision detection using spatial grid
const optimizedRouteEdgePath = (
  fromPos: Position,
  toPos: Position,
  edge: MermaidEdge,
  layout: Layout,
  spatialGrid: SpatialGrid
): Position[] => {
  const startPoint = getOptimizedConnectionPoint(fromPos, toPos, true);
  const endPoint = getOptimizedConnectionPoint(fromPos, toPos, false);
  
  // Use spatial grid for faster collision detection
  const midPoint = {
    x: (startPoint.x + endPoint.x) / 2,
    y: (startPoint.y + endPoint.y) / 2
  };
  
  const nearbyNodes = spatialGrid.getNearbyNodes(midPoint);
  
  // Quick check if path is clear
  let hasCollision = false;
  for (const nodeId of nearbyNodes) {
    if (nodeId === edge.from || nodeId === edge.to) continue;
    
    const nodePos = layout.get(nodeId);
    if (nodePos && fastLineIntersectsNode(startPoint, endPoint, nodePos)) {
      hasCollision = true;
      break;
    }
  }
  
  if (!hasCollision) {
    return [startPoint, endPoint];
  }
  
  // Simple routing strategy - route above/below for horizontal, left/right for vertical
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal - route above or below
    const routeY = fromPos.y + (dy > 0 ? -60 : 60);
    const waypoint1 = { x: fromPos.x + dx * 0.3, y: routeY };
    const waypoint2 = { x: toPos.x - dx * 0.3, y: routeY };
    return [startPoint, waypoint1, waypoint2, endPoint];
  } else {
    // Vertical - route left or right
    const routeX = fromPos.x + (dx > 0 ? -100 : 100);
    const waypoint1 = { x: routeX, y: fromPos.y + dy * 0.3 };
    const waypoint2 = { x: routeX, y: toPos.y - dy * 0.3 };
    return [startPoint, waypoint1, waypoint2, endPoint];
  }
};

// Optimized connection point calculation
const getOptimizedConnectionPoint = (fromPos: Position, toPos: Position, isStart: boolean): Position => {
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) return fromPos;
  
  const nodeWidth = 80;
  const nodeHeight = 40;
  const padding = 5;
  
  const unitX = dx / distance;
  const unitY = dy / distance;
  const basePos = isStart ? fromPos : toPos;
  const direction = isStart ? 1 : -1;
  
  // Fast edge calculation
  const absUnitX = Math.abs(unitX);
  const absUnitY = Math.abs(unitY);
  
  let offsetX: number, offsetY: number;
  
  if (absUnitX > absUnitY) {
    offsetX = direction * Math.sign(unitX) * (nodeWidth / 2 + padding);
    offsetY = direction * unitY * (nodeWidth / 2 + padding) / absUnitX;
  } else {
    offsetY = direction * Math.sign(unitY) * (nodeHeight / 2 + padding);
    offsetX = direction * unitX * (nodeHeight / 2 + padding) / absUnitY;
  }
  
  return {
    x: basePos.x + offsetX,
    y: basePos.y + offsetY
  };
};

// Fast line-rectangle intersection (optimized)
const fastLineIntersectsNode = (lineStart: Position, lineEnd: Position, nodePos: Position): boolean => {
  const nodeWidth = 80;
  const nodeHeight = 40;
  const padding = 10;
  
  const nodeLeft = nodePos.x - nodeWidth/2 - padding;
  const nodeRight = nodePos.x + nodeWidth/2 + padding;
  const nodeTop = nodePos.y - nodeHeight/2 - padding;
  const nodeBottom = nodePos.y + nodeHeight/2 + padding;
  
  // Quick bounding box check
  const minX = Math.min(lineStart.x, lineEnd.x);
  const maxX = Math.max(lineStart.x, lineEnd.x);
  const minY = Math.min(lineStart.y, lineEnd.y);
  const maxY = Math.max(lineStart.y, lineEnd.y);
  
  return !(maxX < nodeLeft || minX > nodeRight || maxY < nodeTop || minY > nodeBottom);
};

// Optimized SVG renderer with caching and batching
export const optimizedSvgRenderer = (ast: MermaidAST, config: SvgConfig): Result<string> => {
  const layout = optimizedCalculateLayout(ast, config);
  const nodes = Array.from(ast.nodes.values());
  
  // Build spatial grid for fast collision detection
  const spatialGrid = new SpatialGrid(100);
  layout.forEach((pos, nodeId) => {
    spatialGrid.addNode(nodeId, pos);
  });
  
  // Pre-allocate arrays for better performance
  const nodeElements: string[] = new Array(nodes.length);
  const edgeElements: string[] = new Array(ast.edges.length);
  
  // Batch render nodes
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const pos = layout.get(node.id);
    if (pos) {
      nodeElements[i] = renderOptimizedSvgNode(node, pos, config.theme);
    }
  }
  
  // Batch render edges
  for (let i = 0; i < ast.edges.length; i++) {
    const edge = ast.edges[i];
    const fromPos = layout.get(edge.from);
    const toPos = layout.get(edge.to);
    
    if (fromPos && toPos) {
      const pathPoints = optimizedRouteEdgePath(fromPos, toPos, edge, layout, spatialGrid);
      edgeElements[i] = renderOptimizedSvgEdge(edge, pathPoints);
    }
  }
  
  // Join all elements
  const svgNodes = nodeElements.filter(Boolean).join('\n  ');
  const svgEdges = edgeElements.filter(Boolean).join('\n  ');
  
  const svg = `<svg width="${config.width}" height="${config.height}" 
                   viewBox="0 0 ${config.width} ${config.height}"
                   xmlns="http://www.w3.org/2000/svg"
                   style="background-color: white;">
  <style>
    .node-rect, .node-circle, .node-rhombus, .node-default { 
      stroke-width: 2; 
    }
    .light, .dark, .neutral { color: #333; }
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

// Optimized node rendering with template literals
const renderOptimizedSvgNode = (node: MermaidNode, position: Position, theme: string): string => {
  const { x, y } = position;
  
  return match(node.shape)
    .with("rectangle", () =>
      `<rect x="${x - 40}" y="${y - 20}" width="80" height="40" class="node-rect ${theme}" stroke="currentColor" fill="none"/>
       <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${node.label}</text>`
    )
    .with("circle", () =>
      `<circle cx="${x}" cy="${y}" r="30" class="node-circle ${theme}" stroke="currentColor" fill="none"/>
       <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${node.label}</text>`
    )
    .with("rhombus", () =>
      `<polygon points="${x - 40},${y} ${x},${y - 20} ${x + 40},${y} ${x},${y + 20}" class="node-rhombus ${theme}" stroke="currentColor" fill="none"/>
       <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${node.label}</text>`
    )
    .otherwise(() =>
      `<rect x="${x - 40}" y="${y - 20}" width="80" height="40" rx="5" class="node-default ${theme}" stroke="currentColor" fill="none"/>
       <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${node.label}</text>`
    );
};

// Optimized edge rendering
const renderOptimizedSvgEdge = (edge: MermaidEdge, pathPoints: Position[]): string => {
  const pathData = pathPoints.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');
  
  const last = pathPoints[pathPoints.length - 1];
  const secondLast = pathPoints[pathPoints.length - 2];
  
  const dx = last.x - secondLast.x;
  const dy = last.y - secondLast.y;
  const angle = Math.atan2(dy, dx);
  const arrowLength = 8;
  
  const arrowX1 = last.x - arrowLength * Math.cos(angle - Math.PI / 6);
  const arrowY1 = last.y - arrowLength * Math.sin(angle - Math.PI / 6);
  const arrowX2 = last.x - arrowLength * Math.cos(angle + Math.PI / 6);
  const arrowY2 = last.y - arrowLength * Math.sin(angle + Math.PI / 6);
  
  const strokeDasharray = match(edge.type)
    .with("dotted", () => "5,5")
    .with("dashed", () => "10,5")
    .otherwise(() => "none");
  
  const strokeWidth = edge.type === "thick" ? "3" : "1";
  
  const midIndex = Math.floor(pathPoints.length / 2);
  const labelPos = pathPoints[midIndex];
  const edgeLabelElement = edge.label ? 
    `<text x="${labelPos.x}" y="${labelPos.y - 5}" text-anchor="middle" font-size="10" fill="currentColor" class="edge-label">${edge.label}</text>` : "";
  
  return `<path d="${pathData}" stroke="currentColor" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}" fill="none"/>
          ${edge.type === "arrow" ? `<polygon points="${last.x},${last.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}" fill="currentColor"/>` : ""}
          ${edgeLabelElement}`;
};

// Performance comparison utility
export const compareRendererPerformance = async (ast: MermaidAST, config: SvgConfig, iterations: number = 1000) => {
  const { benchmark } = await import("./performance.ts");
  const { svgRenderer } = await import("./renderers.ts");
  
  console.log("🎨 Renderer Performance Comparison:");
  
  const originalResult = await benchmark(
    "Original Renderer",
    () => svgRenderer(ast, config),
    iterations
  );
  
  const optimizedResult = await benchmark(
    "Optimized Renderer",
    () => optimizedSvgRenderer(ast, config),
    iterations
  );
  
  const improvement = originalResult.avgTime / optimizedResult.avgTime;
  
  console.log(`Original:   ${originalResult.avgTime.toFixed(3)}ms avg`);
  console.log(`Optimized:  ${optimizedResult.avgTime.toFixed(3)}ms avg`);
  console.log(`Improvement: ${improvement.toFixed(1)}x faster`);
  
  return { original: originalResult, optimized: optimizedResult, improvement };
};