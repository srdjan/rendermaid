/**
 * Optimized renderers with caching and improved algorithms
 * @module renderers
 */
import { match } from "ts-pattern";
import type {
  Result, MermaidAST, MermaidNode, MermaidEdge
} from "./parser.ts";
import { Ok, getNodeShapeSymbols } from "./parser.ts";

/**
 * Discriminated union of all available render formats and their configurations
 */
export type RenderFormat =
  | { readonly type: "svg"; readonly config: SvgConfig }
  | { readonly type: "html"; readonly config: HtmlConfig }
  | { readonly type: "json"; readonly config: JsonConfig }
  | { readonly type: "mermaid"; readonly config: MermaidConfig };

/**
 * Configuration options for SVG rendering
 */
export type SvgConfig = {
  /** Width of the SVG canvas in pixels */
  readonly width: number;
  /** Height of the SVG canvas in pixels */
  readonly height: number;
  /** Spacing between nodes in pixels */
  readonly nodeSpacing: number;
  /** Visual theme for the diagram */
  readonly theme: "light" | "dark" | "neutral";
};

/**
 * Configuration options for HTML rendering
 */
export type HtmlConfig = {
  /** Optional CSS class name for the container */
  readonly className?: string;
  /** Whether to include inline CSS styles */
  readonly includeStyles: boolean;
  /** Whether to make the output responsive */
  readonly responsive: boolean;
};

/**
 * Configuration options for JSON export
 */
export type JsonConfig = {
  /** Whether to format the JSON with indentation */
  readonly pretty: boolean;
  /** Whether to include metadata in the output */
  readonly includeMetadata: boolean;
};

/**
 * Configuration options for Mermaid syntax output
 */
export type MermaidConfig = {
  /** Whether to preserve original formatting */
  readonly preserveFormatting: boolean;
  /** Whether to include comments in the output */
  readonly includeComments: boolean;
};

/**
 * Generic renderer function type - pure transformation from AST to string
 * @template T The configuration type for this renderer
 */
export type Renderer<T> = (ast: MermaidAST, config: T) => Result<string>;

// Position calculation for layout (functional approach)
type Position = { readonly x: number; readonly y: number };
type Layout = ReadonlyMap<string, Position>;

// Layout result includes computed canvas dimensions
type LayoutResult = {
  readonly layout: Layout;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
};

const LAYOUT = {
  MIN_NODE_GAP: 40,
  INITIAL_LAYER_OFFSET: 60,
  CANVAS_PADDING: 60,
  LAYER_SPACING_MULTIPLIER: 1.5,
} as const;

const RENDERING = {
  NODE_TEXT_PADDING: 16,
  NODE_FONT_SIZE: 12,
  MIN_NODE_WIDTH: 60,
  MIN_NODE_HEIGHT: 30,
  COLLISION_PADDING: 15,
  COLLISION_AVOIDANCE_OFFSET: 40,
  PORT_OFFSET: 2,
  MAX_COLLISION_RETRIES: 3,
} as const;

// Cached layout computations
const layoutCache = new Map<string, LayoutResult>();

// Optimized layout algorithm with label-aware spacing and direction support
const optimizedCalculateLayout = (ast: MermaidAST, config: SvgConfig): LayoutResult => {
  // Content-based cache key includes node IDs and edges for correctness
  const nodeKey = Array.from(ast.nodes.keys()).sort().join(",");
  const edgeKey = ast.edges.map(e => `${e.from}->${e.to}`).join(",");
  const direction = ast.diagramType.type === "flowchart" ? ast.diagramType.direction : "TD";
  const cacheKey = `${direction}-${nodeKey}-${edgeKey}-${config.nodeSpacing}`;
  const cached = layoutCache.get(cacheKey);
  if (cached) return cached;

  const nodes = Array.from(ast.nodes.values());
  const edges = ast.edges;
  const layout = new Map<string, Position>();

  if (nodes.length === 0) return { layout, canvasWidth: config.width, canvasHeight: config.height };

  const nodeDims = (nodeId: string) => {
    const node = ast.nodes.get(nodeId);
    return calculateNodeDimensions(node?.label ?? "", node?.shape ?? "rectangle");
  };

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

  // Direction-aware positioning with label-aware spacing
  const isHorizontal = direction === "LR" || direction === "RL";
  const minGap = LAYOUT.MIN_NODE_GAP;

  const axis = isHorizontal
    ? { layerDim: "width" as const, nodeDim: "height" as const, centerValue: config.height / 2 }
    : { layerDim: "height" as const, nodeDim: "width" as const, centerValue: config.width / 2 };

  let maxX = config.width;
  let maxY = config.height;
  let layerOffset = LAYOUT.INITIAL_LAYER_OFFSET;

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];

    // Max size in the layer dimension
    let maxLayerSize = 0;
    for (const nodeId of layer) {
      maxLayerSize = Math.max(maxLayerSize, nodeDims(nodeId)[axis.layerDim]);
    }

    const layerCoord = layerOffset + maxLayerSize / 2;

    // Cumulative offsets in the node dimension
    const offsets: number[] = [0];
    for (let i = 1; i < layer.length; i++) {
      const dims = nodeDims(layer[i]);
      const prevDims = nodeDims(layer[i - 1]);
      const needed = prevDims[axis.nodeDim] / 2 + minGap + dims[axis.nodeDim] / 2;
      offsets.push(offsets[i - 1] + Math.max(config.nodeSpacing, needed));
    }

    const totalSpan = offsets[offsets.length - 1];
    const startNode = axis.centerValue - totalSpan / 2;

    for (let i = 0; i < layer.length; i++) {
      const nodeCoord = startNode + offsets[i];
      const pos = isHorizontal
        ? { x: layerCoord, y: nodeCoord }
        : { x: nodeCoord, y: layerCoord };
      layout.set(layer[i], pos);

      if (isHorizontal) {
        maxX = Math.max(maxX, pos.x + maxLayerSize / 2 + LAYOUT.MIN_NODE_GAP);
      } else {
        maxX = Math.max(maxX, pos.x + LAYOUT.CANVAS_PADDING);
      }
      maxY = Math.max(maxY, pos.y + LAYOUT.CANVAS_PADDING);
    }

    // Advance to next layer
    if (li < layers.length - 1) {
      let nextMaxSize = 0;
      for (const nodeId of layers[li + 1]) {
        nextMaxSize = Math.max(nextMaxSize, nodeDims(nodeId)[axis.layerDim]);
      }
      layerOffset = layerCoord + Math.max(
        config.nodeSpacing * LAYOUT.LAYER_SPACING_MULTIPLIER,
        maxLayerSize / 2 + minGap + nextMaxSize / 2
      );
    }
  }

  // Cache and return with computed canvas dimensions
  const result: LayoutResult = {
    layout,
    canvasWidth: Math.max(config.width, maxX),
    canvasHeight: Math.max(config.height, maxY)
  };
  layoutCache.set(cacheKey, result);
  return result;
};

// Full-path collision detection: scan all nodes against path segments
const findCollidingNodes = (
  pathSegments: ReadonlyArray<readonly [Position, Position]>,
  excludeIds: ReadonlySet<string>,
  layout: Layout,
  nodeShapes: Map<string, string>,
  nodeLabels: Map<string, string>
): string[] => {
  const colliding: string[] = [];
  for (const [nodeId, nodePos] of layout) {
    if (excludeIds.has(nodeId)) continue;
    const shape = nodeShapes.get(nodeId) || "rectangle";
    const label = nodeLabels.get(nodeId) || "";
    for (const [segStart, segEnd] of pathSegments) {
      if (lineIntersectsNode(segStart, segEnd, nodePos, shape, label)) {
        colliding.push(nodeId);
        break;
      }
    }
  }
  return colliding;
};

// Extract path segments from a list of waypoints
const toPathSegments = (points: readonly Position[]): Array<readonly [Position, Position]> => {
  const segments: Array<readonly [Position, Position]> = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push([points[i], points[i + 1]] as const);
  }
  return segments;
};

// Line-node intersection with shape awareness
const lineIntersectsNode = (
  lineStart: Position,
  lineEnd: Position,
  nodePos: Position,
  nodeShape: string,
  nodeLabel?: string
): boolean => {
  const dimensions = calculateNodeDimensions(nodeLabel ?? "", nodeShape);
  const padding = RENDERING.COLLISION_PADDING;

  if (nodeShape === "circle") {
    // Circle intersection using distance to line
    const radius = dimensions.radius! + padding;
    const distanceToLine = distanceFromPointToLine(nodePos, lineStart, lineEnd);
    return distanceToLine < radius;
  } else {
    // Rectangle-based intersection for other shapes
    const halfWidth = dimensions.width / 2 + padding;
    const halfHeight = dimensions.height / 2 + padding;

    const nodeLeft = nodePos.x - halfWidth;
    const nodeRight = nodePos.x + halfWidth;
    const nodeTop = nodePos.y - halfHeight;
    const nodeBottom = nodePos.y + halfHeight;

    // Check if line segment intersects with expanded node bounds
    return lineSegmentIntersectsRect(lineStart, lineEnd, {
      left: nodeLeft,
      right: nodeRight,
      top: nodeTop,
      bottom: nodeBottom
    });
  }
};

// Helper function to calculate distance from point to line segment
const distanceFromPointToLine = (point: Position, lineStart: Position, lineEnd: Position): number => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);

  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)));
  const projection = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy
  };

  return Math.sqrt((point.x - projection.x) ** 2 + (point.y - projection.y) ** 2);
};

// Helper function for line-rectangle intersection
const lineSegmentIntersectsRect = (
  lineStart: Position,
  lineEnd: Position,
  rect: { left: number; right: number; top: number; bottom: number }
): boolean => {
  // Check if either endpoint is inside the rectangle
  if ((lineStart.x >= rect.left && lineStart.x <= rect.right &&
    lineStart.y >= rect.top && lineStart.y <= rect.bottom) ||
    (lineEnd.x >= rect.left && lineEnd.x <= rect.right &&
      lineEnd.y >= rect.top && lineEnd.y <= rect.bottom)) {
    return true;
  }

  // Check intersection with each edge of the rectangle
  return (
    lineIntersectsLine(lineStart, lineEnd, { x: rect.left, y: rect.top }, { x: rect.right, y: rect.top }) ||
    lineIntersectsLine(lineStart, lineEnd, { x: rect.right, y: rect.top }, { x: rect.right, y: rect.bottom }) ||
    lineIntersectsLine(lineStart, lineEnd, { x: rect.right, y: rect.bottom }, { x: rect.left, y: rect.bottom }) ||
    lineIntersectsLine(lineStart, lineEnd, { x: rect.left, y: rect.bottom }, { x: rect.left, y: rect.top })
  );
};

// Helper function for line-line intersection
const lineIntersectsLine = (
  p1: Position, p2: Position,
  p3: Position, p4: Position
): boolean => {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-10) return false;

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

// Calculate exit/entry port positions on node boundaries
const calculatePorts = (
  fromPos: Position,
  toPos: Position,
  fromDim: { width: number; height: number },
  toDim: { width: number; height: number },
  isVertical: boolean,
  isReversed: boolean,
  sameLayer: boolean
): { exitPort: Position; entryPort: Position } => {
  if (sameLayer) {
    if (isVertical) {
      const goRight = toPos.x > fromPos.x;
      return {
        exitPort: {
          x: fromPos.x + (goRight ? fromDim.width / 2 + RENDERING.PORT_OFFSET : -fromDim.width / 2 - RENDERING.PORT_OFFSET),
          y: fromPos.y
        },
        entryPort: {
          x: toPos.x + (goRight ? -toDim.width / 2 - RENDERING.PORT_OFFSET : toDim.width / 2 + RENDERING.PORT_OFFSET),
          y: toPos.y
        }
      };
    }
    const goDown = toPos.y > fromPos.y;
    return {
      exitPort: {
        x: fromPos.x,
        y: fromPos.y + (goDown ? fromDim.height / 2 + RENDERING.PORT_OFFSET : -fromDim.height / 2 - RENDERING.PORT_OFFSET)
      },
      entryPort: {
        x: toPos.x,
        y: toPos.y + (goDown ? -toDim.height / 2 - RENDERING.PORT_OFFSET : toDim.height / 2 + RENDERING.PORT_OFFSET)
      }
    };
  }

  if (isVertical) {
    return isReversed
      ? { exitPort: { x: fromPos.x, y: fromPos.y - fromDim.height / 2 - RENDERING.PORT_OFFSET },
          entryPort: { x: toPos.x, y: toPos.y + toDim.height / 2 + RENDERING.PORT_OFFSET } }
      : { exitPort: { x: fromPos.x, y: fromPos.y + fromDim.height / 2 + RENDERING.PORT_OFFSET },
          entryPort: { x: toPos.x, y: toPos.y - toDim.height / 2 - RENDERING.PORT_OFFSET } };
  }

  return isReversed
    ? { exitPort: { x: fromPos.x - fromDim.width / 2 - RENDERING.PORT_OFFSET, y: fromPos.y },
        entryPort: { x: toPos.x + toDim.width / 2 + RENDERING.PORT_OFFSET, y: toPos.y } }
    : { exitPort: { x: fromPos.x + fromDim.width / 2 + RENDERING.PORT_OFFSET, y: fromPos.y },
        entryPort: { x: toPos.x - toDim.width / 2 - RENDERING.PORT_OFFSET, y: toPos.y } };
};

// Generate straight or Z-shaped orthogonal path between two ports
const generateOrthogonalPath = (exitPort: Position, entryPort: Position, isVertical: boolean): Position[] => {
  if (isVertical) {
    if (Math.abs(exitPort.x - entryPort.x) < 2) {
      return [exitPort, entryPort];
    }
    const midY = (exitPort.y + entryPort.y) / 2;
    return [exitPort, { x: exitPort.x, y: midY }, { x: entryPort.x, y: midY }, entryPort];
  }

  if (Math.abs(exitPort.y - entryPort.y) < 2) {
    return [exitPort, entryPort];
  }
  const midX = (exitPort.x + entryPort.x) / 2;
  return [exitPort, { x: midX, y: exitPort.y }, { x: midX, y: entryPort.y }, entryPort];
};

// Iteratively shift path to avoid collisions with intermediate nodes
const avoidCollisions = (
  path: Position[],
  excludeIds: ReadonlySet<string>,
  layout: Layout,
  nodeShapes: Map<string, string>,
  nodeLabels: Map<string, string>,
  isVertical: boolean
): Position[] => {
  let current = path;
  let segments = toPathSegments(current);
  let collisions = findCollidingNodes(segments, excludeIds, layout, nodeShapes, nodeLabels);

  // If collision on a straight line, promote to Z-shape
  if (collisions.length > 0 && current.length === 2) {
    const initialOffset = RENDERING.COLLISION_AVOIDANCE_OFFSET;
    if (isVertical) {
      const collidingPos = layout.get(collisions[0]);
      const shiftDir = collidingPos && collidingPos.x > current[0].x ? -1 : 1;
      const detourX = current[0].x + shiftDir * initialOffset;
      current = [current[0], { x: detourX, y: current[0].y }, { x: detourX, y: current[1].y }, current[1]];
    } else {
      const collidingPos = layout.get(collisions[0]);
      const shiftDir = collidingPos && collidingPos.y > current[0].y ? -1 : 1;
      const detourY = current[0].y + shiftDir * initialOffset;
      current = [current[0], { x: current[0].x, y: detourY }, { x: current[1].x, y: detourY }, current[1]];
    }
    segments = toPathSegments(current);
    collisions = findCollidingNodes(segments, excludeIds, layout, nodeShapes, nodeLabels);
  }

  // Shift routing channel outward on retries
  let retries = 0;
  while (collisions.length > 0 && retries < RENDERING.MAX_COLLISION_RETRIES) {
    const shiftAmount = RENDERING.COLLISION_AVOIDANCE_OFFSET * (retries + 1);
    const collidingPos = layout.get(collisions[0]);

    if (isVertical && current.length === 4) {
      const currentDetour = current[1].x;
      const shiftDir = collidingPos && collidingPos.x > currentDetour ? -1 : 1;
      const newDetour = currentDetour + shiftDir * shiftAmount;
      current = [current[0], { x: newDetour, y: current[0].y }, { x: newDetour, y: current[3].y }, current[3]];
    } else if (!isVertical && current.length === 4) {
      const currentDetour = current[1].y;
      const shiftDir = collidingPos && collidingPos.y > currentDetour ? -1 : 1;
      const newDetour = currentDetour + shiftDir * shiftAmount;
      current = [current[0], { x: current[0].x, y: newDetour }, { x: current[3].x, y: newDetour }, current[3]];
    } else {
      break;
    }

    segments = toPathSegments(current);
    collisions = findCollidingNodes(segments, excludeIds, layout, nodeShapes, nodeLabels);
    retries++;
  }

  return current;
};

// Direction-aware orthogonal (Manhattan) edge routing with full collision detection
const improvedRouteEdgePath = (
  fromPos: Position,
  toPos: Position,
  edge: MermaidEdge,
  layout: Layout,
  nodeShapes: Map<string, string>,
  nodeLabels: Map<string, string>,
  direction: string
): Position[] => {
  const fromDim = calculateNodeDimensions(nodeLabels.get(edge.from) || "", nodeShapes.get(edge.from) || "rectangle");
  const toDim = calculateNodeDimensions(nodeLabels.get(edge.to) || "", nodeShapes.get(edge.to) || "rectangle");

  const isVertical = direction === "TD" || direction === "TB" || direction === "BT";
  const isReversed = direction === "BT" || direction === "RL";
  const sameLayer = isVertical
    ? Math.abs(fromPos.y - toPos.y) < 10
    : Math.abs(fromPos.x - toPos.x) < 10;

  const { exitPort, entryPort } = calculatePorts(fromPos, toPos, fromDim, toDim, isVertical, isReversed, sameLayer);

  if (sameLayer) return [exitPort, entryPort];

  const path = generateOrthogonalPath(exitPort, entryPort, isVertical);
  return avoidCollisions(path, new Set([edge.from, edge.to]), layout, nodeShapes, nodeLabels, isVertical);
};

// Text measurement and wrapping utilities
const estimateTextWidth = (text: string, fontSize: number = 12): number => {
  // Rough estimation: average character width is ~0.6 * fontSize
  return text.length * fontSize * 0.6;
};

const wrapText = (text: string, maxWidth: number, fontSize: number = 12): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = estimateTextWidth(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Single word is too long, truncate it
        const maxChars = Math.floor(maxWidth / (fontSize * 0.6)) - 3;
        lines.push(word.substring(0, maxChars) + "...");
        currentLine = "";
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
};

// Calculate dynamic node dimensions based on label content
const calculateNodeDimensions = (label: string, shape: string): { width: number; height: number; radius?: number } => {
  // When no label is provided, return static fallback dimensions
  if (!label) {
    switch (shape) {
      case "circle":
        return { width: RENDERING.MIN_NODE_WIDTH, height: RENDERING.MIN_NODE_WIDTH, radius: RENDERING.MIN_NODE_WIDTH / 2 };
      case "rhombus":
        return { width: 80, height: 40 };
      case "stadium":
        return { width: 100, height: 40 };
      case "hexagon":
        return { width: 90, height: 40 };
      default:
        return { width: 80, height: 40 };
    }
  }

  const fontSize = RENDERING.NODE_FONT_SIZE;
  const padding = RENDERING.NODE_TEXT_PADDING;
  const minWidth = RENDERING.MIN_NODE_WIDTH;
  const minHeight = RENDERING.MIN_NODE_HEIGHT;

  // Estimate text dimensions
  const textWidth = estimateTextWidth(label, fontSize);
  const requiredWidth = Math.max(minWidth, textWidth + padding);

  switch (shape) {
    case "circle": {
      // For circles, use the larger of width/height requirements
      const radius = Math.max(25, Math.sqrt(requiredWidth * requiredWidth + minHeight * minHeight) / 2 + 5);
      return { width: radius * 2, height: radius * 2, radius };
    }

    case "rhombus": {
      // Rhombus needs extra space due to diagonal orientation
      return {
        width: Math.max(80, requiredWidth * 1.4),
        height: Math.max(40, minHeight + 10)
      };
    }

    case "stadium": {
      return {
        width: Math.max(100, requiredWidth + 20),
        height: Math.max(40, minHeight + 10)
      };
    }

    default: {
      // rectangle and others
      return {
        width: Math.max(minWidth, requiredWidth),
        height: Math.max(minHeight, minHeight + 10)
      };
    }
  }
};

// Improved node rendering with dynamic sizing and label backgrounds
const renderImprovedSvgNode = (node: MermaidNode, position: Position, theme: string): string => {
  const { x, y } = position;
  const dimensions = calculateNodeDimensions(node.label, node.shape);
  const { width, height, radius } = dimensions;

  // Calculate text positioning and wrapping
  const maxTextWidth = width - RENDERING.NODE_TEXT_PADDING;
  const lines = wrapText(node.label, maxTextWidth);
  const lineHeight = 14;
  const totalTextHeight = lines.length * lineHeight;
  const startY = y - (totalTextHeight / 2) + (lineHeight / 2);

  // Generate text elements with background
  const textElements = lines.map((line, index) => {
    const textY = startY + (index * lineHeight);
    const textWidth = estimateTextWidth(line, 12);
    const backgroundWidth = textWidth + 8;
    const backgroundHeight = lineHeight;

    return `
      <rect x="${x - backgroundWidth / 2}" y="${textY - backgroundHeight / 2}"
            width="${backgroundWidth}" height="${backgroundHeight}"
            fill="white" stroke="none" rx="2" opacity="0.9" class="node-label-bg"/>
      <text x="${x}" y="${textY + 1}" text-anchor="middle"
            font-size="12" fill="#333" class="node-label">${line}</text>`;
  }).join('');

  return match(node.shape)
    .with("rectangle", () =>
      `<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}"
             class="node-rect ${theme}" stroke="currentColor" fill="none"/>
       ${textElements}`
    )
    .with("circle", () =>
      `<circle cx="${x}" cy="${y}" r="${radius}"
               class="node-circle ${theme}" stroke="currentColor" fill="none"/>
       ${textElements}`
    )
    .with("rhombus", () =>
      `<polygon points="${x - width / 2},${y} ${x},${y - height / 2} ${x + width / 2},${y} ${x},${y + height / 2}"
               class="node-rhombus ${theme}" stroke="currentColor" fill="none"/>
       ${textElements}`
    )
    .with("stadium", () =>
      `<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}"
             rx="${height / 2}" class="node-stadium ${theme}" stroke="currentColor" fill="none"/>
       ${textElements}`
    )
    .otherwise(() =>
      `<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}"
             rx="5" class="node-default ${theme}" stroke="currentColor" fill="none"/>
       ${textElements}`
    );
};

// Improved edge rendering with better label positioning
const renderImprovedSvgEdge = (edge: MermaidEdge, pathPoints: Position[]): string => {
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

  // Improved label positioning with background
  let edgeLabelElement = "";
  if (edge.label) {
    const midIndex = Math.floor(pathPoints.length / 2);
    const labelPos = pathPoints[midIndex];

    // Calculate label offset from line
    let offsetX = 0;
    let offsetY = -12; // Default offset above the line

    // For multi-segment paths, use the direction of the middle segment
    if (pathPoints.length > 2) {
      const prevPoint = pathPoints[midIndex - 1] || pathPoints[0];
      const nextPoint = pathPoints[midIndex + 1] || pathPoints[pathPoints.length - 1];

      const segmentDx = nextPoint.x - prevPoint.x;
      const segmentDy = nextPoint.y - prevPoint.y;
      const segmentAngle = Math.atan2(segmentDy, segmentDx);

      // Offset perpendicular to the line direction
      offsetX = -Math.sin(segmentAngle) * 12;
      offsetY = Math.cos(segmentAngle) * 12;
    }

    const labelX = labelPos.x + offsetX;
    const labelY = labelPos.y + offsetY;

    // Estimate text width for background rectangle
    const textWidth = edge.label.length * 6 + 8; // Rough estimation
    const textHeight = 14;

    edgeLabelElement = `
      <rect x="${labelX - textWidth / 2}" y="${labelY - textHeight / 2}"
            width="${textWidth}" height="${textHeight}"
            fill="white" stroke="none" rx="2" opacity="0.9"/>
      <text x="${labelX}" y="${labelY + 1}" text-anchor="middle"
            font-size="10" fill="#333" class="edge-label">${edge.label}</text>`;
  }

  return `<path d="${pathData}" stroke="currentColor" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}" fill="none"/>
          ${edge.type === "arrow" ? `<polygon points="${last.x},${last.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}" fill="currentColor"/>` : ""}
          ${edgeLabelElement}`;
};

/**
 * Direct SVG renderer with optimized layout calculation and edge routing
 * @param ast The Abstract Syntax Tree to render
 * @param config SVG rendering configuration
 * @returns A Result containing the SVG string or an error
 */
export const svgRenderer: Renderer<SvgConfig> = (ast, config) => {
  const { layout, canvasWidth, canvasHeight } = optimizedCalculateLayout(ast, config);
  const nodes = Array.from(ast.nodes.values());
  const direction = ast.diagramType.type === "flowchart" ? ast.diagramType.direction : "TD";

  // Create node shape and label mappings for accurate connection points
  const nodeShapes = new Map<string, string>();
  const nodeLabels = new Map<string, string>();
  nodes.forEach(node => {
    nodeShapes.set(node.id, node.shape);
    nodeLabels.set(node.id, node.label);
  });

  // Pre-allocate arrays for better performance
  const nodeElements: string[] = new Array(nodes.length);
  const edgeElements: string[] = new Array(ast.edges.length);

  // Batch render nodes with improved rendering
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const pos = layout.get(node.id);
    if (pos) {
      nodeElements[i] = renderImprovedSvgNode(node, pos, config.theme);
    }
  }

  // Batch render edges with direction-aware orthogonal routing
  for (let i = 0; i < ast.edges.length; i++) {
    const edge = ast.edges[i];
    const fromPos = layout.get(edge.from);
    const toPos = layout.get(edge.to);

    if (fromPos && toPos) {
      const pathPoints = improvedRouteEdgePath(fromPos, toPos, edge, layout, nodeShapes, nodeLabels, direction);
      edgeElements[i] = renderImprovedSvgEdge(edge, pathPoints);
    }
  }

  // Join all elements
  const svgNodes = nodeElements.filter(Boolean).join('\n  ');
  const svgEdges = edgeElements.filter(Boolean).join('\n  ');

  const svg = `<svg width="${canvasWidth}" height="${canvasHeight}"
                   viewBox="0 0 ${canvasWidth} ${canvasHeight}"
                   xmlns="http://www.w3.org/2000/svg"
                   style="background-color: white;">
  <style>
    .node-rect, .node-circle, .node-rhombus, .node-stadium, .node-default {
      stroke-width: 2;
    }
    .light, .dark, .neutral { color: #333; }
    text { font-family: sans-serif; font-size: 12px; fill: #333; }
    .edge-label {
      font-size: 10px;
      fill: #333;
    }
    .node-label {
      font-size: 12px;
      fill: #333;
      font-weight: 500;
    }
    .node-label-bg {
      opacity: 0.9;
    }
  </style>
  ${svgNodes}
  ${svgEdges}
</svg>`;

  return Ok(svg);
};

/**
 * Direct HTML renderer that creates semantic HTML structure
 * @param ast The Abstract Syntax Tree to render
 * @param config HTML rendering configuration
 * @returns A Result containing the HTML string or an error
 */
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

/**
 * Direct JSON renderer that exports AST as structured data
 * @param ast The Abstract Syntax Tree to export
 * @param config JSON export configuration
 * @returns A Result containing the JSON string or an error
 */
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

/**
 * Direct Mermaid renderer that converts AST back to Mermaid syntax.
 * Note: preserveFormatting and includeComments config fields are accepted
 * for API compatibility but not yet implemented.
 * @param ast The Abstract Syntax Tree to convert
 * @param _config Mermaid output configuration (reserved for future use)
 * @returns A Result containing the Mermaid syntax string or an error
 */
export const mermaidRenderer: Renderer<MermaidConfig> = (ast, _config) => {
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

/**
 * Universal render function that can output to any supported format
 * @param ast The Abstract Syntax Tree to render
 * @param format The render format and configuration
 * @returns A Result containing the rendered output or an error
 */
export const render = (ast: MermaidAST, format: RenderFormat): Result<string> =>
  match(format)
    .with({ type: "svg" }, ({ config }) => svgRenderer(ast, config))
    .with({ type: "html" }, ({ config }) => htmlRenderer(ast, config))
    .with({ type: "json" }, ({ config }) => jsonRenderer(ast, config))
    .with({ type: "mermaid" }, ({ config }) => mermaidRenderer(ast, config))
    .exhaustive();

/**
 * Renders a Mermaid AST to SVG format with optional configuration
 * @param ast The Abstract Syntax Tree to render
 * @param config Optional SVG rendering configuration (uses defaults if not provided)
 * @returns A Result containing the SVG string or an error
 */
export const renderSvg = (ast: MermaidAST, config?: Partial<SvgConfig>): Result<string> =>
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

/**
 * Renders a Mermaid AST to HTML format with optional configuration
 * @param ast The Abstract Syntax Tree to render
 * @param config Optional HTML rendering configuration (uses defaults if not provided)
 * @returns A Result containing the HTML string or an error
 */
export const renderHtml = (ast: MermaidAST, config?: Partial<HtmlConfig>): Result<string> =>
  render(ast, {
    type: "html",
    config: {
      includeStyles: true,
      responsive: true,
      ...config
    }
  });

/**
 * Exports a Mermaid AST to JSON format with optional configuration
 * @param ast The Abstract Syntax Tree to export
 * @param config Optional JSON export configuration (uses defaults if not provided)
 * @returns A Result containing the JSON string or an error
 */
export const renderJson = (ast: MermaidAST, config?: Partial<JsonConfig>): Result<string> =>
  render(ast, {
    type: "json",
    config: {
      pretty: true,
      includeMetadata: false,
      ...config
    }
  });

/**
 * Converts a Mermaid AST back to Mermaid syntax with optional configuration
 * @param ast The Abstract Syntax Tree to convert
 * @param config Optional Mermaid output configuration (uses defaults if not provided)
 * @returns A Result containing the Mermaid syntax string or an error
 */
export const renderMermaid = (ast: MermaidAST, config?: Partial<MermaidConfig>): Result<string> =>
  render(ast, {
    type: "mermaid",
    config: {
      preserveFormatting: true,
      includeComments: false,
      ...config
    }
  });