# FigmaLint Plugin Updates — February 2026

This document describes the major features implemented in coordinated updates: a 4-tab UI restructure, optional API key support, API key test/validation, and an AI-optional Analyze tab.

---

## Overview

The FigmaLint plugin was updated from a 2-tab layout with a blocking API key requirement to a 4-tab layout where:

- Non-AI features (CTDS Audit) work immediately without configuration
- AI features (Enhanced Analysis, Chat) show friendly prompts when an API key is needed
- A dedicated Settings tab provides API key configuration with a live "Test Key" feature

These changes were combined into a single update to avoid intermediate rework and ensure a consistent end-to-end experience.

---

## 1. UI Restructure: 4-Tab Layout

### Before

| Tab | Contents |
|-----|----------|
| **Analyze** | Quick actions bar (CTDS Audit + Analyze Component + gear icon), API key configuration card, batch mode toggle, CTDS Audit results, component analysis results |
| **Chat** | Chat interface (disabled until API key saved) |

### After

| Tab | Contents |
|-----|----------|
| **CTDS Audit** | "Run CTDS Audit" button, audit results display |
| **AI Analyze** | "Analyze Component" button, batch mode toggle, component analysis results |
| **AI Chat** | Chat interface (always accessible) |
| **Settings** | AI provider selector, model selector, API key input, Test Key / Save Key / Clear Key buttons, test result display, status messages |

### Key Changes

- Default tab changed from "Analyze" to "CTDS Audit"
- CTDS Audit button and results moved from Analyze tab to their own dedicated tab
- Settings/configuration extracted from the Analyze tab into a standalone Settings tab
- No more collapsible settings section — Settings tab is always a full, visible form
- Chat tab is always clickable (not disabled when no key)

### Tab Navigation

```
[CTDS Audit] [AI Analyze] [AI Chat] [Settings]
```

---

## 2. Optional API Key

### Feature Matrix

| Feature | Requires API Key | Reason |
|---------|-----------------|--------|
| CTDS Audit | No | Rule-based validation of variable collections, text styles, component bindings |
| Token Extraction | No | Direct node inspection |
| Collection Validation | No | Structure checking |
| Enhanced Analysis | **Yes** | AI-powered component insights |
| Batch Analysis | **Yes** | AI-powered multi-component analysis |
| Chat Interface | **Yes** | LLM-powered Q&A |

### Behavior Flow

**Without API Key:**

1. Plugin opens to CTDS Audit tab
2. User can run CTDS Audit immediately
3. Clicking "Analyze Component" in AI Analyze tab shows a prompt and redirects to Settings
4. Typing a message in AI Chat and sending it redirects to Settings
5. Settings tab shows badge: "AI features disabled"

**With API Key:**

1. All features work normally
2. Settings tab shows badge: "Configured"
3. "Clear Key" button is visible in Settings

### Implementation Approach

- **Progressive disclosure:** Instead of blocking the UI, users are guided to Settings when an AI feature is requested
- **`showApiKeyPrompt(featureName)`**: Switches to the Settings tab and focuses the API key input
- **Buttons always enabled:** The Analyze Component and Chat send buttons are never disabled; they redirect to Settings if no key is configured
- **`updateAnalyzeButtonState()`**: Converted to a no-op
- **Backend friendly errors:** `handleEnhancedAnalyze()` and `handleChatMessage()` in `message-handler.ts` return descriptive error messages with `requiresApiKey: true` instead of throwing

---

## 3. API Key Test and Validation

### How It Works

1. User enters an API key in the Settings tab
2. User clicks "Test Key"
3. The UI sends a `test-api-key` message to the plugin backend
4. Backend validates the key format (provider-specific prefix and length)
5. Backend makes a minimal API call to the provider (a simple prompt requesting "success")
6. Result is sent back to the UI as `test-api-key-result`
7. UI displays success or error with copyable details

### Provider Format Validation

| Provider | Expected Prefix | Minimum Length |
|----------|----------------|----------------|
| Anthropic (Claude) | `sk-ant-` | 40 characters |
| OpenAI (GPT) | `sk-` | 20 characters |
| Google (Gemini) | `AIza` | 35 characters |

### Input Protection

When a user is actively typing in the API key field, switching providers will not clear the input for 2 seconds. Per-provider keys are stored in memory so switching back restores the previously entered key.

### UI Elements

- **Test Key button**: Secondary style, disabled when input is empty, shows "Testing..." during validation
- **Test result banner**: Shows "Valid Key" (success) or "Invalid Key: [error]" (error)
- **Error details textarea**: Copyable monospace textarea with provider, model, and error details

---

## Files Modified

### `ui-enhanced.html`

- **Tab navigation**: 2 buttons replaced with 4 (`CTDS Audit`, `AI Analyze`, `AI Chat`, `Settings`)
- **New CTDS Audit tab**: Contains audit button and results section
- **Cleaned AI Analyze tab**: Removed CTDS Audit button, settings card, system results; kept only Analyze Component button, batch mode, and component results
- **New Settings tab**: Full settings form with provider/model/API key inputs, Test Key / Save Key / Clear Key buttons, test result display
- **JavaScript variables**: Removed `apiKeyCard`, `quickAnalyzeSystemButton`, `showConfigButton`, `hideConfigButton`, `clearApiKeyLink`, `systemResults`, `systemAuditContent`; Added `ctdsAuditButton`, `ctdsAuditResults`, `ctdsAuditContent`, `settingsCard`, `settingsContent`, `settingsStatusBadge`, `clearKeyButton`, `testKeyButton`, `testResult`, `testErrorDetails`, `userIsEditingKey`
- **New functions**: `showApiKeyPrompt()`, `handleTestApiKey()`, `updateTestResult()`
- **Updated functions**: `switchTab()`, `handleApiKeyStatus()`, `handleApiKeySaved()`, `handleClearApiKey()`, `handleAnalyzeComponent()`, `handleAnalyzeSystem()`, `handleSendChat()`, `updateChatInputState()`, `handleApiKeyChange()`, `handleProviderChange()`, `updateAnalyzeButtonState()` (now no-op)
- **New message handler**: `test-api-key-result` case in `handlePluginMessage()`
- **Renamed references**: All `systemAuditContent` to `ctdsAuditContent`, `systemResults` to `ctdsAuditResults`
- **Removed footer link**: "Clear saved API key" link removed (clearing is now in Settings tab)

### `src/ui/message-handler.ts`

- **`handleEnhancedAnalyze()`**: Returns friendly `analysis-error` with `requiresApiKey: true` instead of throwing when no API key
- **`handleChatMessage()`**: Returns friendly `chat-error` with `requiresApiKey: true` instead of throwing
- **New switch case**: `test-api-key` dispatches to `handleTestApiKey()`
- **New functions**: `handleTestApiKey()`, `getExpectedKeyFormat()`, `getProviderDisplayName()`
- **`handleTestApiKey()`**: Validates key format, makes a minimal API call via `callProvider()`, sends `test-api-key-result` back to UI

### `src/types.ts`

- Added `'test-api-key'` to the `UIMessageType` union type

### Build Output (`dist/`)

- `dist/code.js` — Rebuilt with all backend changes
- `dist/ui-enhanced.html` — Copied with all UI changes

---

## Testing Guide

### Test Case 1: First Launch (No API Key)

1. Open plugin in Figma
2. Verify CTDS Audit tab is active by default
3. Click "Run CTDS Audit" — verify it runs successfully without an API key
4. Switch to "AI Analyze" tab
5. Click "Analyze Component" — verify it redirects to Settings tab with a warning message
6. Switch to "AI Chat" tab
7. Type a message and press Send — verify it redirects to Settings tab
8. Verify Settings tab shows "AI features disabled" badge

### Test Case 2: Test API Key (Valid)

1. Go to Settings tab
2. Select Anthropic as provider
3. Enter a valid API key (`sk-ant-...`)
4. Click "Test Key"
5. Verify button shows "Testing..."
6. Verify success banner appears: "Valid Key"

### Test Case 3: Test API Key (Invalid)

1. Go to Settings tab
2. Enter an invalid key (e.g., `sk-ant-invalidkey123456789012345678901234`)
3. Click "Test Key"
4. Verify error banner appears with error details
5. Verify the error details textarea is visible and copyable

### Test Case 4: Save API Key

1. Enter a valid API key
2. Click "Save Key"
3. Verify success status message
4. Verify Settings badge changes to "Configured"
5. Verify "Clear Key" button appears
6. Switch to AI Analyze tab — verify Analyze Component works
7. Switch to AI Chat tab — verify chat works

### Test Case 5: Clear API Key

1. In Settings tab, click "Clear Key"
2. Confirm the dialog
3. Verify badge reverts to "AI features disabled"
4. Verify "Clear Key" button disappears
5. Switch to CTDS Audit — verify it still works
6. Switch to AI Analyze and click Analyze Component — verify it redirects to Settings

### Test Case 6: Provider Switching

1. Type an API key for Anthropic
2. Switch to OpenAI provider
3. Verify the Anthropic key is preserved (switch back to verify)
4. Verify model dropdown updates for the selected provider
5. Type a key while provider is being switched — verify the typed key is not cleared

---
---

## 4. AI-Optional Analyze Tab

### Problem

The "Analyze Component" button was fully gated behind an API key check. Clicking it without a configured key returned an error and blocked all analysis — including features that are 100% deterministic and read directly from the Figma API.

### Solution

The Analyze tab now runs in two phases:

1. **Phase 1 — Deterministic (always runs, no API key needed):** Extracts component properties, states, design tokens, runs accessibility checks, validates collection structure, text style sync, component bindings, and detects naming issues. Results are sent to the UI immediately.
2. **Phase 2 — AI Enhancement (only when API key is available):** Calls the LLM provider for a rich component description, recommended properties, and MCP readiness scoring. Results arrive as a follow-up message and enrich the already-displayed deterministic data.

If no API key is configured, Phase 2 is skipped and AI sections display a friendly empty state with a link to Settings. If the API call fails, deterministic results remain visible and the AI section shows the error.

### Tab Rename

The tab was renamed from **AI Analyze** to **Analyze** to reflect that it no longer requires AI.

### Section Badges

Each collapsible section in the Analyze results now displays a small icon indicating its data source:

| Section | Badge | Meaning |
|---------|-------|---------|
| Component Audit | Checkmark (muted) | Local analysis — no API key needed |
| Property Cheat Sheet | Checkmark (muted) | Local analysis — no API key needed |
| Token Analysis | Checkmark (muted) | Local analysis — no API key needed |
| AI Interpretation | Sparkle (accent) | AI-powered — requires API key |
| Component Metadata | Clock (subtle) | Hybrid — basic data is local, description is AI-enhanced |
| Developer Handoff | Checkmark (muted) | Local analysis — no API key needed |

Badges use CSS classes `.badge-local`, `.badge-ai`, and `.badge-hybrid` with tooltips on hover.

### AI Empty States

When no API key is configured:

- **AI Interpretation section** shows: a sparkle icon, "AI interpretation requires an API key.", and a clickable "Configure in Settings" link that switches to the Settings tab.
- **Recommended Properties** subsection within Property Cheat Sheet is hidden (only appears when AI data arrives).

When AI is in-flight:

- The AI badge in the section header pulses with a CSS animation.
- The AI Interpretation section shows "Running AI-enhanced analysis..." with a pulsing sparkle icon.

### New Message Type

A new plugin-to-UI message `ai-enhancement-result` carries the asynchronous AI results:

```typescript
interface AIEnhancementResult {
  description?: string;       // AI-generated component description
  recommendations?: Array<{   // AI-recommended properties
    name: string;
    type: string;
    description: string;
    examples: string[];
  }>;
  mcpReadiness?: MCPReadiness; // AI-generated readiness scoring
  metadata?: Partial<ComponentMetadata>; // Full AI metadata for export
  error?: string;              // If AI call failed
}
```

### Feature Matrix (Updated)

| Feature | Without API Key | With API Key |
|---------|----------------|--------------|
| CTDS Audit | Yes | Yes |
| Component Audit (states, accessibility, readiness) | Yes | Yes |
| Property Cheat Sheet | Yes | Yes |
| Token Analysis | Yes | Yes |
| Naming Issue Detection | Yes | Yes |
| Auto-fix: Token Binding | Yes | Yes |
| Auto-fix: Layer Renaming | Yes | Yes |
| Developer Handoff / Export | Yes | Yes |
| AI Interpretation (MCP Readiness) | No — empty state shown | Yes |
| AI Component Description | No — basic string used | Yes |
| AI Recommended Properties | No — section hidden | Yes |
| Chat Interface | No — redirects to Settings | Yes |

---

### Files Modified

#### `src/core/component-analyzer.ts`

- **New function `runDeterministicAnalysis()`**: Exported function that bundles all non-AI analysis — calls `extractActualComponentProperties()`, `extractActualComponentStates()`, `extractDesignTokensFromNode()`, `createAuditResults()`, `analyzeNamingIssues()`, and `generateFallbackMCPReadiness()`. Returns the same `EnhancedAnalysisResult` shape as the AI path.

#### `src/ui/message-handler.ts`

- **New function `resolveAnalyzableNode()`**: Extracted node resolution logic (instance handling, variant traversal, parent walking) from `handleEnhancedAnalyze()` for clarity.
- **Rewritten `handleEnhancedAnalyze()`**: Two-phase architecture — Phase 1 calls `runDeterministicAnalysis()` and sends results immediately; Phase 2 conditionally calls `processEnhancedAnalysis()` and sends `ai-enhancement-result`. Outer errors still send `analysis-error`.
- **Removed API key early-return gate**: The `if (!storedApiKey) { ... return; }` block at the top of `handleEnhancedAnalyze()` was removed.
- **Import added**: `runDeterministicAnalysis` from `../core/component-analyzer`.

#### `src/types.ts`

- **`EnhancedAnalysisResult`**: Added `aiPending?: boolean` field so the UI knows whether AI data is in-flight.
- **New interface `AIEnhancementResult`**: Documents the shape of the follow-up `ai-enhancement-result` message.

#### `ui-enhanced.html`

- **Tab renamed**: "AI Analyze" changed to "Analyze".
- **API key gate removed**: `handleAnalyzeComponent()` no longer checks `apiKeySaved` or calls `showApiKeyPrompt()`.
- **Section badges added**: Each collapsible header now includes an `.analysis-badge` span with an SVG icon and tooltip.
- **New CSS**: `.analysis-badge`, `.badge-local`, `.badge-ai`, `.badge-hybrid`, `.ai-empty-state`, `.ai-loading-badge` (pulsing animation).
- **MCP Readiness rendering**: Now handles three states — AI in-flight (pulsing loader), no API key (empty state with Settings link), or AI failed (error with note that deterministic results remain).
- **New message handler**: `ai-enhancement-result` case in `handlePluginMessage()` dispatches to `handleAIEnhancementResult()`.
- **New function `handleAIEnhancementResult()`**: Updates AI Interpretation section, enriches metadata description, adds recommended properties to Property Cheat Sheet, updates Developer Handoff export data.

#### Build Output (`dist/`)

- `dist/code.js` — Rebuilt with all backend changes.
- `dist/ui-enhanced.html` — Copied with all UI changes.

---

### Testing Guide (AI-Optional)

#### Test Case 7: Analyze Without API Key

1. Clear any saved API key in Settings
2. Switch to the Analyze tab
3. Select a component in Figma
4. Click "Analyze Component"
5. Verify deterministic results appear: Component Audit (with score), Property Cheat Sheet, Token Analysis, naming issues
6. Verify AI Interpretation section shows: sparkle icon, "AI interpretation requires an API key.", "Configure in Settings" link
7. Verify "Recommended Properties" subsection does not appear in Property Cheat Sheet
8. Verify the section badges are visible: checkmarks on local sections, sparkle on AI Interpretation, clock on Component Metadata
9. Click "Configure in Settings" link — verify it switches to the Settings tab

#### Test Case 8: Analyze With API Key

1. Configure a valid API key in Settings
2. Switch to the Analyze tab and select a component
3. Click "Analyze Component"
4. Verify deterministic results appear immediately
5. Verify AI Interpretation section shows "Running AI-enhanced analysis..." with pulsing sparkle
6. Wait for AI results to arrive
7. Verify AI Interpretation section updates with MCP readiness score, strengths, gaps, recommendations
8. Verify Component Metadata description is enriched (longer, more detailed)
9. Verify "Recommended Properties" subsection appears if AI suggested any
10. Verify status bar shows "AI-enhanced analysis complete!"

#### Test Case 9: AI Failure Graceful Degradation

1. Configure an invalid or expired API key
2. Select a component and click "Analyze Component"
3. Verify deterministic results appear and remain visible
4. Verify AI Interpretation section shows error message with "Deterministic results are still shown above."
5. Verify status bar shows warning about AI failure
