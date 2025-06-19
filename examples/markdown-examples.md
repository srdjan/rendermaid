# RenderMaid Markdown Examples

This document demonstrates how RenderMaid can parse and render Mermaid diagrams embedded in markdown files.

## Basic Flowchart

Here's a simple flowchart showing a basic decision process:

```mermaid
flowchart TD
    A[Start] --> B{Is Valid?}
    B -->|Yes| C[Process]
    B -->|No| D[Error]
    C --> E[End]
    D --> E
```

## Complex System Architecture

This diagram shows a more complex system with multiple components:

```mermaid
flowchart LR
    U([User]) --> W[Web App]
    W --> API[API Gateway]
    API --> A[Auth Service]
    API --> B[Business Logic]
    B --> DB[(Database)]
    B --> C[Cache]
    A --> DB
    C --> DB
    B --> Q[Message Queue]
    Q --> W2[Worker Service]
    W2 --> DB
```

## Zero-Knowledge Proof Verification

A cryptographic workflow demonstrating zero-knowledge proof verification:

```mermaid
flowchart TD
    TS[Trusted Setup] --> P[Prover]
    TS --> V[Verifier]
    P --> P2[Generate ZK proof using secret + public parameters]
    P2 --> V2[Send proof]
    V2 --> V3{Verify proof using public parameters}
    V3 -->|Proof is valid| A1[✅ Accept - Employment verified]
    V3 -->|Proof is invalid| A2[❌ Reject - Verification failed]
```

## Development Workflow

A typical software development workflow:

```mermaid
flowchart LR
    A([Start]) --> B[Code]
    B --> C[Test]
    C --> D{Pass?}
    D -->|Yes| E[Deploy]
    D -->|No| B
    E --> F[Monitor]
    F --> G{Issues?}
    G -->|Yes| H[Debug]
    G -->|No| I((Success))
    H --> B
```

## Usage Instructions

To parse diagrams from this markdown file using RenderMaid:

```typescript
import { parseMermaidFromMarkdownFile } from "@rendermaid/core";

const result = await parseMermaidFromMarkdownFile("examples/markdown-examples.md");

if (result.success) {
  console.log(`Found ${result.data.length} diagrams`);
  
  result.data.forEach((ast, index) => {
    console.log(`Diagram ${index + 1}:`);
    console.log(`  Nodes: ${ast.nodes.size}`);
    console.log(`  Edges: ${ast.edges.length}`);
  });
}
```

## Features Demonstrated

- ✅ Multiple diagrams in single file
- ✅ Different diagram complexities
- ✅ Various node shapes (rectangles, rhombus, circles, etc.)
- ✅ Edge labels and conditional flows
- ✅ Real-world use cases (auth, crypto, DevOps)
- ✅ Proper markdown formatting
- ✅ Code examples for usage

This file contains **4 Mermaid diagrams** that can be automatically extracted and rendered by RenderMaid's markdown parsing functionality.
