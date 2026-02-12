# Code Analyzer Configuration Guide

## Overview

This document explains how to configure the code analyzer to recognize legitimate patterns in your codebase and avoid false positives.

## Excluding Shadcn/UI Components from Prop Spreading Rules

### Problem

The analyzer was flagging prop spreading in `src/components/ui/` components (shadcn/ui wrappers) as violations. However, these are **intentionally designed as passthrough wrapper components** and should be excluded.

### Solution Applied

Updated `.cursor/commands/codereview/comprehensive-coding-standards.json` to exclude UI library components:

```json
{
  "id": "manual-prop-mapping",
  "area": "props_api_design",
  "type": "regex",
  "scope": "line",
  "pattern": "\\{\\s*\\.\\.\\.[A-Za-z0-9_]+",
  "summary": "Prop spreading detected",
  "resolution": "Map props explicitly unless implementing a known passthrough pattern.",
  "conditions": {
    "include_globs": ["**/*.tsx", "**/*.jsx"],
    "exclude_globs": [
      "**/*.stories.*", // Storybook files
      "**/components/ui/**", // UI library components (relative path)
      "**/src/components/ui/**", // UI library components (absolute path)
      "**/@radix-ui/**", // Radix UI primitives
      "**/@headlessui/**" // Headless UI primitives
    ]
  }
}
```

### What This Excludes

This configuration now properly excludes:

1. **Shadcn/UI Components**: All files in `src/components/ui/` directory
2. **Storybook Files**: Any `*.stories.tsx` or `*.stories.jsx` files
3. **UI Library Dependencies**: Files from `@radix-ui` and `@headlessui` packages

### Legitimate Prop Spreading Patterns

According to your coding standards, the following patterns are **acceptable** and should not be flagged:

#### ✅ UI Library Wrapper Components

```tsx
// src/components/ui/button.tsx
import * as ButtonPrimitive from "@radix-ui/react-button";

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props} // ✅ Legitimate: passthrough wrapper for styling
      />
    );
  },
);
```

#### ✅ Form Components with Service Layer

```tsx
export const ProductForm = () => {
  const formConfig = FormService.prepareConfig();
  return <FormComponent {...formConfig} />; // ✅ Legitimate: config object
};
```

#### ✅ Next.js Page Components

```tsx
export default function Page({ params, searchParams }) {
  const pageProps = PageService.transformData(params, searchParams);
  return <PageTemplate {...pageProps} />; // ✅ Legitimate: server data
}
```

## Adding More Exclusions

### By Directory Path

To exclude additional directories, add to the `exclude_globs` array:

```json
"exclude_globs": [
  "**/*.stories.*",
  "**/components/ui/**",
  "**/src/components/ui/**",
  "**/my-custom-wrappers/**"  // Add your custom exclusions here
]
```

### By File Pattern

To exclude specific file patterns:

```json
"exclude_globs": [
  "**/*.stories.*",
  "**/components/ui/**",
  "**/*.config.tsx",          // Exclude config files
  "**/*.generated.tsx"        // Exclude generated files
]
```

## Configuring Other Rules

### Excluding Pure Function Checks for API Routes

API routes and scripts legitimately use `Date.now()`, `crypto.randomUUID()`, etc. You can configure exclusions for these:

```json
{
  "id": "deterministic-functions",
  "area": "pure_functions",
  "type": "regex",
  "scope": "line",
  "pattern": "(Math\\.random|Date\\.now|new\\s+Date\\()",
  "summary": "Non-deterministic API used",
  "resolution": "Inject time/randomness or pass as arguments.",
  "conditions": {
    "exclude_globs": [
      "**/app/api/**", // API routes
      "**/scripts/**", // Build/utility scripts
      "**/migrations/**" // Database migrations
    ]
  }
}
```

### Adjusting Complexity Thresholds

To adjust the nesting or parameter limits:

```json
{
  "id": "nesting-limit",
  "area": "code_complexity",
  "type": "metric",
  "metric": {
    "kind": "max_nesting",
    "params": { "threshold": 4 } // Changed from 3 to 4
  },
  "summary": "Block nesting exceeds threshold",
  "resolution": "Use early returns and guard clauses."
}
```

## Re-running the Analysis

After making configuration changes, re-run the analyzer:

```bash
npx tsx .cursor/commands/codereview/codereviewWrapper.ts src
```

Or use the Cursor slash command:

```
/codereview src
```

## Expected Results After Configuration

With the updated configuration, you should see:

- **Before**: ~176 prop spreading violations
- **After**: ~10-20 violations (only legitimate issues)

The analyzer will now correctly identify:

- ❌ Prop spreading in business logic components
- ✅ Prop spreading in UI library wrappers (excluded)
- ❌ Prop spreading on native DOM elements without proper typing
- ✅ Prop spreading in Next.js page components (context-appropriate)

## Testing the Configuration

To test if your exclusions are working:

1. Run the analyzer on a small test directory:

   ```bash
   /codereview src/components/ui
   ```

2. Check the results - there should be minimal or no violations in UI wrapper components.

3. Verify the `analysis-src/violations/analysis_props_api_design.json` file to ensure UI components are not listed.

## Troubleshooting

### Exclusions Not Working

If exclusions aren't working, check:

1. **Path format**: Use `**/` prefix for recursive matching
2. **File extension**: Ensure the pattern matches your file extensions (`.tsx`, `.jsx`)
3. **Case sensitivity**: Patterns are case-sensitive
4. **Relative paths**: Test both with and without `src/` prefix

### Too Many False Positives

If you're still seeing false positives after configuration:

1. Check the component type - is it truly a passthrough wrapper?
2. Add more specific exclusion patterns
3. Consider adding component-type detection logic to the analyzer
4. Document your specific patterns in this file for team reference

## Advanced Configuration

### Custom Component Type Detection

For more sophisticated exclusion logic, you can modify the analyzer to detect:

1. **Import patterns**: Check if file imports from `@radix-ui` or similar
2. **Component characteristics**: Detect simple wrapper components automatically
3. **Directory structure**: Automatically exclude certain directory patterns
4. **File naming**: Exclude files matching specific naming conventions

These require modifying `runFullAnalysis.ts` - contact the team lead for assistance.

## Maintaining Standards

### When to Update Exclusions

Update exclusions when:

- ✅ Adding new UI library dependencies (e.g., `@mui/material`)
- ✅ Creating new directories for wrapper components
- ✅ Adopting new framework patterns (e.g., server actions)

### When NOT to Add Exclusions

Don't add exclusions for:

- ❌ Genuine violations that should be fixed
- ❌ Convenience (it's easier to exclude than fix)
- ❌ Temporary code that will be refactored
- ❌ "Special cases" that aren't actually special

## Documentation

Keep this configuration documented:

1. **Update this file** when making changes
2. **Commit configuration changes** to version control
3. **Notify the team** of significant exclusion changes
4. **Review quarterly** to ensure exclusions are still relevant

## Support

For questions or issues with the analyzer configuration:

1. Check this documentation first
2. Review the comprehensive coding standards document
3. Examine example violations in `analysis-src/violations/`
4. Contact the code quality team for assistance

---

**Last Updated**: 2025-10-25  
**Configuration Version**: 1.1.0
