# RenderMaid

A high-performance, functional TypeScript library for parsing and rendering Mermaid diagrams. Built with Claude, and adhering to modern functional programming principles, featuring optimized parsing, intelligent edge routing, and multi-format output.

**Supports both programmatic diagram creation and parsing diagrams from markdown files.**

[![JSR](https://jsr.io/badges/@rendermaid/core)](https://jsr.io/@rendermaid/core)

## ✨ Features

- **🚀 High Performance**: Optimized tokenization-based parser with spatial grid rendering
- **🎯 Functional Architecture**: Immutable data structures and pure functions throughout
- **📊 Multi-format Output**: SVG, HTML, JSON, and round-trip Mermaid rendering
- **📝 Markdown Integration**: Parse diagrams directly from markdown files and content
- **🔄 Smart Edge Routing**: Intelligent collision avoidance for clean diagrams
- **📱 Professional Styling**: White backgrounds with proper contrast and typography
- **⚡ Type-Safe**: Full TypeScript support with discriminated unions and pattern matching
- **🧪 Comprehensive Testing**: Performance benchmarks and validation included

## 🚀 Quick Start

### Installation

```bash
# Deno
deno add @rendermaid/core

# Node.js/Bun
npx jsr add @rendermaid/core
```

### Basic Usage

```typescript
import { parseMermaid, renderSvg } from "@rendermaid/core";

const diagram = `
flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process A]
  B -->|No| D[Process B]
  C --> E[End]
  D --> E[End]
`;

// Parse the diagram
const parseResult = parseMermaid(diagram);

if (parseResult.success) {
  // Render to SVG
  const svgResult = renderSvg(parseResult.data, {
    width: 800,
    height: 600,
    theme: "light"
  });
  
  if (svgResult.success) {
    console.log(svgResult.data); // SVG string
  }
}
```

### Parsing from Markdown Files

RenderMaid can extract and parse Mermaid diagrams directly from markdown files:

```typescript
import { parseMermaidFromMarkdownFile } from "@rendermaid/core";

// Parse all diagrams from a markdown file
const result = await parseMermaidFromMarkdownFile("documentation.md");

if (result.success) {
  console.log(`Found ${result.data.length} diagrams`);

  // Process each diagram
  result.data.forEach((ast, index) => {
    console.log(`Diagram ${index + 1}:`);
    console.log(`  Nodes: ${ast.nodes.size}`);
    console.log(`  Edges: ${ast.edges.length}`);

    // Render each diagram
    const svgResult = renderSvg(ast, { theme: "light" });
    if (svgResult.success) {
      // Save or process the SVG
      console.log(`  SVG generated: ${svgResult.data.length} chars`);
    }
  });
}
```

**Example markdown file:**

````markdown
# System Documentation

## Authentication Flow

```mermaid
flowchart TD
    A[User Login] --> B{Valid Credentials?}
    B -->|Yes| C[Generate JWT]
    B -->|No| D[Show Error]
    C --> E[Redirect to Dashboard]
    D --> A
```

## Database Schema

```mermaid
flowchart LR
    U[Users] --> P[Posts]
    U --> C[Comments]
    P --> C
```
````

### Extract Diagrams from Markdown Content

You can also extract diagrams from markdown content directly:

```typescript
import { extractMermaidFromMarkdown } from "@rendermaid/core";

const markdownContent = `
# Documentation

```mermaid
flowchart TD
    A --> B --> C
```

More content here...
`;

const diagrams = extractMermaidFromMarkdown(markdownContent);
console.log(`Found ${diagrams.length} diagram(s)`);

// Parse each extracted diagram
diagrams.forEach(diagramCode => {
  const parseResult = parseMermaid(diagramCode);
  if (parseResult.success) {
    // Process the AST
    console.log("Parsed successfully!");
  }
});

```

## 📚 API Reference

### Core Functions

#### `parseMermaid(input: string): Result<MermaidAST>`

Parses a Mermaid diagram string into an Abstract Syntax Tree.

```typescript
const result = parseMermaid(`
flowchart LR
  A([User Input]) --> B{Validate}
  B -->|Valid| C[Process Data]
  B -->|Invalid| D[Show Error]
`);
```

#### `parseMermaidFromMarkdownFile(filePath: string): Promise<Result<MermaidAST[]>>`

Parses all Mermaid diagrams from a markdown file.

```typescript
const result = await parseMermaidFromMarkdownFile("docs/architecture.md");

if (result.success) {
  result.data.forEach((ast, index) => {
    console.log(`Diagram ${index + 1}: ${ast.nodes.size} nodes`);
  });
}
```

#### `extractMermaidFromMarkdown(content: string): string[]`

Extracts Mermaid diagram code blocks from markdown content.

```typescript
const markdownContent = `
# Documentation
\`\`\`mermaid
flowchart TD
    A --> B
\`\`\`
`;

const diagrams = extractMermaidFromMarkdown(markdownContent);
// Returns: ["flowchart TD\n    A --> B"]
```

#### Rendering Functions

**SVG Rendering**

```typescript
renderSvg(ast: MermaidAST, config?: Partial<SvgConfig>): Result<string>

// Example
const svg = renderSvg(ast, {
  width: 1000,
  height: 800,
  theme: "dark",
  nodeSpacing: 150
});
```

**HTML Rendering**

```typescript
renderHtml(ast: MermaidAST, config?: Partial<HtmlConfig>): Result<string>

// Example  
const html = renderHtml(ast, {
  includeStyles: true,
  responsive: true,
  className: "my-diagram"
});
```

**JSON Export**

```typescript
renderJson(ast: MermaidAST, config?: Partial<JsonConfig>): Result<string>

// Example
const json = renderJson(ast, {
  pretty: true,
  includeMetadata: true
});
```

**Round-trip Mermaid**

```typescript
renderMermaid(ast: MermaidAST, config?: Partial<MermaidConfig>): Result<string>

// Example - convert back to Mermaid syntax
const mermaid = renderMermaid(ast, {
  preserveFormatting: true
});
```

### Configuration Types

```typescript
type SvgConfig = {
  width: number;
  height: number;
  nodeSpacing: number;
  theme: "light" | "dark" | "neutral";
};

type HtmlConfig = {
  className?: string;
  includeStyles: boolean;
  responsive: boolean;
};

type JsonConfig = {
  pretty: boolean;
  includeMetadata: boolean;
};
```

### AST Types

```typescript
type MermaidAST = {
  readonly diagramType: DiagramType;
  readonly nodes: ReadonlyMap<string, MermaidNode>;
  readonly edges: readonly MermaidEdge[];
  readonly metadata: ReadonlyMap<string, unknown>;
};

type MermaidNode = {
  readonly id: string;
  readonly label: string;
  readonly shape: NodeShape;
  readonly metadata?: ReadonlyMap<string, unknown>;
};

type MermaidEdge = {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly type: ConnectionType;
  readonly metadata?: ReadonlyMap<string, unknown>;
};
```

## 🎨 Supported Diagram Elements

### Node Shapes

| Shape | Syntax | Description |
|-------|--------|-------------|
| Rectangle | `A[Label]` | Standard rectangular node |
| Rounded | `A(Label)` | Rounded rectangle |
| Circle | `A((Label))` | Circular node |
| Rhombus | `A{Label}` | Diamond/decision node |
| Stadium | `A([Label])` | Pill-shaped node |
| Hexagon | `A{{Label}}` | Hexagonal node |

### Connection Types

| Type | Syntax | Description |
|------|--------|-------------|
| Arrow | `-->` | Standard arrow |
| Line | `---` | Simple line |
| Thick | `==>` | Thick arrow |
| Dotted | `-.->` | Dotted arrow |
| Dashed | `---` | Dashed line |

### Edge Labels

```mermaid
flowchart TD
  A[Start] --> B{Check}
  B -->|Yes| C[Continue]
  B -->|No| D[Stop]
```

## 🏗️ Architecture

RenderMaid follows functional programming principles:

- **Immutable Data**: All AST operations return new instances
- **Pure Functions**: Renderers are side-effect free transformations
- **Type Safety**: Leverages TypeScript's type system and pattern matching
- **Performance**: Optimized with caching, spatial grids, and efficient algorithms

### Performance Features

- **Tokenization-based Parser**: 1.4-1.7x faster than combinator approach
- **Layout Caching**: Cached layouts by diagram characteristics  
- **Spatial Grid**: O(1) collision detection for edge routing
- **Pre-allocated Arrays**: Reduced memory allocations during rendering

## 🔄 Functional Pipeline Example

```typescript
import { parseMermaid, renderSvg, renderJson } from "@rendermaid/core";

const processDiagram = (input: string) => {
  const parseResult = parseMermaid(input);
  
  if (!parseResult.success) {
    return { error: parseResult.error };
  }
  
  const ast = parseResult.data;
  
  return {
    svg: renderSvg(ast, { theme: "light" }),
    json: renderJson(ast, { pretty: true }),
    nodeCount: ast.nodes.size,
    edgeCount: ast.edges.length
  };
};

// Usage
const result = processDiagram(`
flowchart TD
  A[Input] --> B[Process] --> C[Output]
`);
```

## 🧪 Testing & Validation

RenderMaid includes comprehensive validation:

```typescript
import { validateAST, analyzeAST } from "@rendermaid/core";

const parseResult = parseMermaid(diagram);
if (parseResult.success) {
  const ast = parseResult.data;
  
  // Validate AST integrity
  const errors = validateAST(ast);
  if (errors.length > 0) {
    console.log("Validation issues:", errors);
  }
  
  // Analyze diagram complexity
  const analysis = analyzeAST(ast);
  console.log("Complexity score:", analysis.complexity);
  console.log("Node shapes:", analysis.nodeShapes);
}
```

## ⚡ Performance

Performance characteristics on modern hardware:

| Operation | Small (5 nodes) | Medium (25 nodes) | Large (50 nodes) |
|-----------|------------------|-------------------|------------------|
| Parsing | ~0.02ms | ~0.09ms | ~0.18ms |
| SVG Render | ~0.02ms | ~0.06ms | ~0.11ms |
| Full Pipeline | ~0.05ms | ~0.15ms | ~0.29ms |

*Performance scales sub-linearly with diagram size*

## 🔧 Development

```bash
# Clone and setup
git clone <repository>
cd rendermaid

# Run demo
deno task demo

# Run performance tests  
deno task perf

# Development with file watching
deno task dev

# Test markdown parsing with example file
deno task markdown
```

### Example Files

- `examples/markdown-examples.md` - Comprehensive markdown file with 4 different diagram types
- `examples/advanced.ts` - Advanced usage examples including markdown parsing

### Testing

RenderMaid includes comprehensive unit tests covering all modules:

```bash
# Run all tests
deno task test

# Run tests with file watching
deno task test-watch

# Run end-to-end tests
deno task e2e

# Run markdown parsing demo
deno task markdown
```

**Test Coverage:**

- **59 unit tests** across parser, renderers, utilities, markdown parsing, and integration
- **Parser tests**: Node/edge creation, AST operations, error handling
- **Renderer tests**: SVG, HTML, JSON, Mermaid output with various configurations
- **Markdown tests**: File parsing, content extraction, mixed valid/invalid diagrams
- **Utility tests**: AST analysis, validation, transformation, performance monitoring
- **Integration tests**: End-to-end workflows, round-trip testing, performance validation

Test files are located in the `tests/` directory:

- `tests/parser.test.ts` - Parser functionality tests
- `tests/renderers.test.ts` - Rendering engine tests
- `tests/utils.test.ts` - Utility function tests
- `tests/markdown.test.ts` - Markdown parsing tests
- `tests/integration.test.ts` - Integration and workflow tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the functional programming patterns
4. Add tests for new functionality
5. Ensure performance benchmarks pass
6. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [Mermaid.js](https://mermaid.js.org/) - The original Mermaid diagramming tool
- [ts-pattern](https://github.com/gvergnaud/ts-pattern) - Pattern matching library used internally

---

**RenderMaid** - Fast, functional, and type-safe Mermaid diagram processing for modern TypeScript applications.
