/**
 * Unit tests for markdown parsing functionality
 */

import { assertEquals, assert } from "@std/assert";
import {
  extractMermaidFromMarkdown,
  parseMermaidFromMarkdownFile,
  createSampleMarkdownFiles
} from "../examples/advanced.ts";
import { parseMermaid } from "../lib/parser.ts";

Deno.test("Markdown - Extract single mermaid block", () => {
  const markdown = `# Test Document

Some text here.

\`\`\`mermaid
flowchart TD
    A --> B
    B --> C
\`\`\`

More text.`;

  const blocks = extractMermaidFromMarkdown(markdown);
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].trim(), "flowchart TD\n    A --> B\n    B --> C");
});

Deno.test("Markdown - Extract multiple mermaid blocks", () => {
  const markdown = `# Multiple Diagrams

First diagram:

\`\`\`mermaid
flowchart TD
    A --> B
\`\`\`

Second diagram:

\`\`\`mermaid
flowchart LR
    X --> Y
\`\`\`

End of document.`;

  const blocks = extractMermaidFromMarkdown(markdown);
  assertEquals(blocks.length, 2);
  assert(blocks[0].includes("A --> B"));
  assert(blocks[1].includes("X --> Y"));
});

Deno.test("Markdown - No mermaid blocks found", () => {
  const markdown = `# Regular Document

This is just regular markdown with no diagrams.

\`\`\`javascript
console.log("Not a mermaid diagram");
\`\`\`

The end.`;

  const blocks = extractMermaidFromMarkdown(markdown);
  assertEquals(blocks.length, 0);
});

Deno.test("Markdown - Empty mermaid blocks ignored", () => {
  const markdown = `# Test

\`\`\`mermaid
\`\`\`

\`\`\`mermaid
flowchart TD
    A --> B
\`\`\`

\`\`\`mermaid


\`\`\``;

  const blocks = extractMermaidFromMarkdown(markdown);
  assertEquals(blocks.length, 1);
  assert(blocks[0].includes("A --> B"));
});

Deno.test("Markdown - Case insensitive mermaid detection", () => {
  const markdown = `# Test

\`\`\`MERMAID
flowchart TD
    A --> B
\`\`\`

\`\`\`Mermaid
flowchart LR
    X --> Y
\`\`\``;

  const blocks = extractMermaidFromMarkdown(markdown);
  assertEquals(blocks.length, 2);
});

Deno.test("Markdown - Parse valid diagrams from content", () => {
  const markdown = `# Valid Diagrams

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
\`\`\`

\`\`\`mermaid
flowchart LR
    X --> Y --> Z
\`\`\``;

  const blocks = extractMermaidFromMarkdown(markdown);
  assertEquals(blocks.length, 2);

  // Test that each block can be parsed successfully
  blocks.forEach((block, index) => {
    const parseResult = parseMermaid(block);
    assert(parseResult.success, `Diagram ${index + 1} should parse successfully`);
    if (parseResult.success) {
      assert(parseResult.data.nodes.size > 0, `Diagram ${index + 1} should have nodes`);
    }
  });
});

Deno.test("Markdown - Handle mixed valid and invalid diagrams", () => {
  const markdown = `# Mixed Content

Valid:
\`\`\`mermaid
flowchart TD
    A --> B
\`\`\`

Invalid:
\`\`\`mermaid
invalid syntax here
\`\`\`

Another valid:
\`\`\`mermaid
flowchart LR
    X --> Y
\`\`\``;

  const blocks = extractMermaidFromMarkdown(markdown);
  assertEquals(blocks.length, 3);

  let validCount = 0;
  let invalidCount = 0;

  blocks.forEach(block => {
    const parseResult = parseMermaid(block);
    if (parseResult.success) {
      validCount++;
    } else {
      invalidCount++;
    }
  });

  assertEquals(validCount, 2);
  assertEquals(invalidCount, 1);
});

Deno.test("Markdown - File parsing with sample files", async () => {
  // Create sample files for testing
  await createSampleMarkdownFiles();

  try {
    // Test parsing the documentation file
    const result = await parseMermaidFromMarkdownFile("examples/sample-docs.md");
    assert(result.success, "Should successfully parse documentation file");

    if (result.success) {
      assertEquals(result.data.length, 3, "Should find 3 diagrams in documentation");

      // Verify each diagram has expected structure
      result.data.forEach((ast, index) => {
        assert(ast.nodes.size > 0, `Diagram ${index + 1} should have nodes`);
        assert(ast.diagramType.type === "flowchart", `Diagram ${index + 1} should be flowchart`);
      });
    }

    // Test parsing the README file
    const readmeResult = await parseMermaidFromMarkdownFile("examples/sample-readme.md");
    assert(readmeResult.success, "Should successfully parse README file");

    if (readmeResult.success) {
      assertEquals(readmeResult.data.length, 1, "Should find 1 diagram in README");
    }

  } finally {
    // Clean up test files
    try {
      await Deno.remove("examples/sample-docs.md");
      await Deno.remove("examples/sample-readme.md");
      await Deno.remove("examples/sample-mixed.md");
    } catch {
      // Ignore cleanup errors
    }
  }
});

Deno.test("Markdown - File not found error handling", async () => {
  const result = await parseMermaidFromMarkdownFile("nonexistent-file.md");
  assert(!result.success, "Should fail for non-existent file");
  assert(result.error.includes("Failed to read file"), "Should have appropriate error message");
});

Deno.test("Markdown - Complex diagram extraction", () => {
  const markdown = `# Zero-Knowledge Proof Documentation

## Overview

This document explains zero-knowledge proofs.

## Verification Flow

\`\`\`mermaid
flowchart TD
    TS[Trusted Setup] --> P[Prover]
    TS --> V[Verifier]
    P --> P2[Generate ZK proof using secret + public parameters]
    P2 --> V2[Send proof]
    V2 --> V3{Verify proof using public parameters}
    V3 -->|Proof is valid| A1[✅ Accept]
    V3 -->|Proof is invalid| A2[❌ Reject]
\`\`\`

## Key Properties

The verification process ensures privacy.`;

  const blocks = extractMermaidFromMarkdown(markdown);
  assertEquals(blocks.length, 1);

  const parseResult = parseMermaid(blocks[0]);
  assert(parseResult.success, "ZK proof diagram should parse successfully");

  if (parseResult.success) {
    const ast = parseResult.data;
    assertEquals(ast.nodes.size, 8, "Should have 8 nodes");
    assertEquals(ast.edges.length, 7, "Should have 7 edges");

    // Check for specific nodes
    assert(ast.nodes.has("TS"), "Should have Trusted Setup node");
    assert(ast.nodes.has("P"), "Should have Prover node");
    assert(ast.nodes.has("V"), "Should have Verifier node");
    assert(ast.nodes.has("V3"), "Should have decision node");
  }
});
