/**
 * Advanced RenderMaid usage examples
 */

import {
  parseMermaid,
  renderSvg,
  analyzeAST,
  validateAST,
  transformAST,
  type MermaidAST,
  type Result
} from "../mod.ts";

// Complex flowchart with multiple shapes and connections
const complexFlowchart = `
flowchart LR
  A([User Input]) --> B{Validate}
  B -->|Valid| C[Process Data]
  B -->|Invalid| D[Show Error]
  C --> E[(Database)]
  E --> F[Generate Report]
  F --> G((Success))
  D --> H[Retry]
  H --> A
`;

const runAdvancedExample = () => {
  console.log("🚀 Advanced RenderMaid Example\n");

  // Parse and analyze
  const parseResult = parseMermaid(complexFlowchart);

  if (parseResult.success) {
    const ast = parseResult.data;

    // Analyze the diagram
    const analysis = analyzeAST(ast);
    console.log("📈 Diagram Analysis:");
    console.log(`  Complexity Score: ${analysis.complexity}`);
    console.log(`  Node Shapes: ${JSON.stringify(analysis.nodeShapes)}`);
    console.log(`  Edge Types: ${JSON.stringify(analysis.edgeTypes)}`);

    // Validate the AST
    const validationErrors = validateAST(ast);
    if (validationErrors.length === 0) {
      console.log("✅ AST validation passed");
    } else {
      console.log("⚠️ Validation issues:", validationErrors);
    }

    // Custom transformation example
    const addTimestampTransformer = (ast: MermaidAST): MermaidAST => {
      const newMetadata = new Map(ast.metadata);
      newMetadata.set("processedAt", new Date().toISOString());
      return {
        ...ast,
        metadata: newMetadata
      };
    };

    const enhancedAST = transformAST(ast, addTimestampTransformer);
    console.log("🔄 Applied custom transformation");

    // Render with different configurations
    const configs = [
      { theme: "light" as const, name: "Light Theme" },
      { theme: "dark" as const, name: "Dark Theme" },
      { theme: "neutral" as const, name: "Neutral Theme" }
    ];

    configs.forEach(({ theme, name }) => {
      const result = renderSvg(enhancedAST, {
        width: 1000,
        height: 600,
        theme,
        nodeSpacing: 150
      });

      if (result.success) {
        console.log(`🎨 ${name} SVG generated (${result.data.length} chars)`);
      }
    });

  } else {
    console.error("❌ Parse error:", parseResult.error);
  }
};

// ============================================================================
// MARKDOWN FILE PARSING EXAMPLES
// ============================================================================

/**
 * Extract Mermaid diagrams from markdown content
 * Supports both ```mermaid and ```mermaid blocks
 */
const extractMermaidFromMarkdown = (markdownContent: string): string[] => {
  const mermaidBlocks: string[] = [];

  // Regex to match mermaid code blocks (case insensitive)
  // Updated to handle cases where there might be no newline after ```mermaid
  const mermaidRegex = /```mermaid\s*\n?([\s\S]*?)\n?```/gi;

  let match;
  while ((match = mermaidRegex.exec(markdownContent)) !== null) {
    const diagramContent = match[1].trim();
    // Only include non-empty content that doesn't just contain backticks
    if (diagramContent && !diagramContent.match(/^`*$/)) {
      mermaidBlocks.push(diagramContent);
    }
  }

  return mermaidBlocks;
};

/**
 * Parse all Mermaid diagrams from a markdown file
 */
const parseMermaidFromMarkdownFile = async (filePath: string): Promise<Result<MermaidAST[]>> => {
  try {
    const markdownContent = await Deno.readTextFile(filePath);
    const mermaidBlocks = extractMermaidFromMarkdown(markdownContent);

    if (mermaidBlocks.length === 0) {
      return { success: false, error: "No Mermaid diagrams found in markdown file" };
    }

    const parsedDiagrams: MermaidAST[] = [];
    const errors: string[] = [];

    for (let i = 0; i < mermaidBlocks.length; i++) {
      const block = mermaidBlocks[i];
      const parseResult = parseMermaid(block);

      if (parseResult.success) {
        parsedDiagrams.push(parseResult.data);
      } else {
        errors.push(`Diagram ${i + 1}: ${parseResult.error}`);
      }
    }

    if (parsedDiagrams.length === 0) {
      return { success: false, error: `All diagrams failed to parse: ${errors.join(", ")}` };
    }

    if (errors.length > 0) {
      console.warn("⚠️ Some diagrams failed to parse:", errors);
    }

    return { success: true, data: parsedDiagrams };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to read file: ${errorMessage}` };
  }
};

// ============================================================================
// MARKDOWN EXAMPLES AND DEMO
// ============================================================================

/**
 * Create sample markdown files for testing
 */
const createSampleMarkdownFiles = async (): Promise<void> => {
  // Sample 1: Documentation with multiple diagrams
  const documentationMarkdown = `# System Architecture Documentation

This document describes our system architecture using Mermaid diagrams.

## User Authentication Flow

\`\`\`mermaid
flowchart TD
    A[User Login] --> B{Valid Credentials?}
    B -->|Yes| C[Generate JWT]
    B -->|No| D[Show Error]
    C --> E[Redirect to Dashboard]
    D --> A
\`\`\`

## Database Schema

\`\`\`mermaid
flowchart LR
    U[Users] --> P[Posts]
    U --> C[Comments]
    P --> C
    P --> T[Tags]
\`\`\`

## Zero-Knowledge Proof Verification

\`\`\`mermaid
flowchart TD
    TS[Trusted Setup] --> P[Prover]
    TS --> V[Verifier]
    P --> P2[Generate ZK proof]
    P2 --> V2[Send proof]
    V2 --> V3{Verify proof}
    V3 -->|Valid| A1[✅ Accept]
    V3 -->|Invalid| A2[❌ Reject]
\`\`\`

That's our complete system overview.
`;

  // Sample 2: README with single diagram
  const readmeMarkdown = `# Project README

Welcome to our project!

## Workflow

\`\`\`mermaid
flowchart LR
    A([Start]) --> B[Code]
    B --> C[Test]
    C --> D{Pass?}
    D -->|Yes| E[Deploy]
    D -->|No| B
    E --> F((End))
\`\`\`

## Installation

Run \`npm install\` to get started.
`;

  // Sample 3: Mixed content with invalid diagram
  const mixedMarkdown = `# Mixed Content

Valid diagram:

\`\`\`mermaid
flowchart TD
    A --> B
    B --> C
\`\`\`

Invalid diagram:

\`\`\`mermaid
invalid syntax here
this should fail
\`\`\`

Another valid diagram:

\`\`\`mermaid
flowchart LR
    X[Start] --> Y[End]
\`\`\`
`;

  await Deno.writeTextFile("examples/sample-docs.md", documentationMarkdown);
  await Deno.writeTextFile("examples/sample-readme.md", readmeMarkdown);
  await Deno.writeTextFile("examples/sample-mixed.md", mixedMarkdown);

  console.log("📝 Created sample markdown files:");
  console.log("  - examples/sample-docs.md (3 diagrams)");
  console.log("  - examples/sample-readme.md (1 diagram)");
  console.log("  - examples/sample-mixed.md (2 valid, 1 invalid)");
};

/**
 * Demo function for markdown parsing
 */
const runMarkdownDemo = async (): Promise<void> => {
  console.log("\n🔍 Markdown Parsing Demo");
  console.log("═".repeat(50));

  // Create sample files
  await createSampleMarkdownFiles();

  const testFiles = [
    "examples/sample-docs.md",
    "examples/sample-readme.md",
    "examples/sample-mixed.md"
  ];

  for (const filePath of testFiles) {
    console.log(`\n📄 Processing: ${filePath}`);
    console.log("─".repeat(30));

    const result = await parseMermaidFromMarkdownFile(filePath);

    if (result.success) {
      const diagrams = result.data;
      console.log(`✅ Found ${diagrams.length} valid diagram(s)`);

      diagrams.forEach((ast, index) => {
        const analysis = analyzeAST(ast);
        console.log(`  Diagram ${index + 1}:`);
        console.log(`    Type: ${ast.diagramType.type}`);
        console.log(`    Nodes: ${ast.nodes.size}`);
        console.log(`    Edges: ${ast.edges.length}`);
        console.log(`    Complexity: ${analysis.complexity}`);

        // Render each diagram
        const svgResult = renderSvg(ast, {
          width: 800,
          height: 600,
          theme: "light",
          nodeSpacing: 120
        });

        if (svgResult.success) {
          const outputFile = `${filePath.replace('.md', '')}-diagram-${index + 1}.svg`;
          Deno.writeTextFileSync(outputFile, svgResult.data);
          console.log(`    SVG: Saved to ${outputFile}`);
        }
      });
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  }

  console.log("\n🎯 Markdown parsing demo completed!");
};

// Export functions for use in tests
export {
  runAdvancedExample,
  extractMermaidFromMarkdown,
  parseMermaidFromMarkdownFile,
  createSampleMarkdownFiles,
  runMarkdownDemo
};

// Run markdown demo if this file is executed directly
if (import.meta.main) {
  runAdvancedExample();
  await runMarkdownDemo();
}
