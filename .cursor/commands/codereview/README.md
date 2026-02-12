# CodeReview Slash Command

This folder contains all files needed for the `/codereview` Cursor slash command.

## 📁 File Structure

```
.cursor/commands/codereview/
├── README.md                           # This file
├── SETUP.md                           # Detailed setup instructions
├── codereviewWrapper.ts               # Execution wrapper script
├── runFullAnalysis.ts                # Main TypeScript analyzer
├── githubActionAnalyzer.ts            # GitHub Actions analyzer
├── astAnalyzer.ts                     # AST analysis utilities
├── utils.ts                           # Shared utilities
├── comprehensive-coding-standards.json # Machine-readable rules (required)
└── tsconfig.scripts.json              # TypeScript configuration

.cursor/rules/
└── comprehensive-coding-standards.mdc  # Human-readable standards (for Cursor rules)
```

## 🚀 Quick Start

1. **Install Dependencies:**

   ```bash
   pnpm install
   ```

2. **Use the Command:**
   - Type `/codereview` in Cursor (analyzes changed files in `src` by default)
   - Type `/codereview packages/ui` (analyzes changed files in custom directory)
   - Type `/codereview --all` (analyzes all files, not just changed)
   - Type `/codereview --changed` (explicitly analyze changed files - same as default)
   - Type `/codereview --staged` (analyzes only staged files)

## 📊 What It Does

Performs comprehensive code analysis against 13 coding standard areas:

1. **Atomic Design** - Component abstraction, reusability
2. **Declarative Code** - JSX patterns, DOM manipulation
3. **Pure Functions** - Side effects, deterministic outputs
4. **Code Complexity** - Cyclomatic complexity, nesting
5. **Component Structure** - File organization, co-location
6. **Import/Export** - Named exports, barrel files
7. **Props & API Design** - Context-aware naming, YAGNI
8. **SSR & DOM Safety** - Server-side rendering compatibility
9. **Styling & CSS** - CSS-first approach, breakpoints
10. **Testing** - Un-DRY tests, explicit branches
11. **Early Returns** - Guard clauses, nested conditionals
12. **State Management** - useReducer, derivative state
13. **SVG Guidelines** - Accessibility, sizing, theming

## 📁 Output

Generates **26 comprehensive analysis files**:

- 📂 `analysis-{ROOT_DIR}/violations/` (13 files)
- 📂 `analysis-{ROOT_DIR}/metrics/` (5 files)
- 📂 `analysis-{ROOT_DIR}/comprehensive/` (5 files)
- 📂 `analysis-{ROOT_DIR}/diagrams/` (2 files)
- 📂 `analysis-{ROOT_DIR}/summary/` (1 file)

## ✨ Key Features

- ✅ **100% File Coverage** - Analyzes every TypeScript/JavaScript file
- ✅ **AST-Based Analysis** - TypeScript compiler accuracy
- ✅ **Context-Aware** - Understands React/Next.js patterns
- ✅ **Real-time Progress** - Batch updates every 50 files
- ✅ **Quantitative Scoring** - Performance/Security/Maintainability (1-5)
- ✅ **Project Health Grade** - Overall A-F rating
- ✅ **Visual Diagrams** - Mermaid component hierarchy charts
- ✅ **Git Integration** - Analyze only changed or staged files

## 🔧 Requirements

- Node.js 20+
- pnpm (or npm/yarn)
- TypeScript/JavaScript project
- Write permissions for output directory

## 📖 Documentation

See `SETUP.md` for detailed setup instructions and troubleshooting.
