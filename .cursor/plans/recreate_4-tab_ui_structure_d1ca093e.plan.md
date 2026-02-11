---
name: Recreate 4-Tab UI Structure
overview: Re-implement the plugin UI restructuring that changed the layout from 2 tabs (Analyze, Chat) to 4 tabs (CTDS Audit, AI Analyze, AI Chat, Settings). This involves moving the CTDS Audit button and results to their own tab, and extracting Settings into a dedicated tab.
todos: []
isProject: false
---

# Re-implement 4-Tab UI Structure for FigmaLint Plugin

## Overview

This plan documents the UI restructuring changes that were made to `[ui-enhanced.html](ui-enhanced.html)`. The plugin was reorganized from 2 tabs to 4 dedicated tabs for better organization.

## Original Structure (Before Changes)

- **Tab 1: Analyze** - Contained quick actions bar (with CTDS Audit button), settings (collapsible), batch mode toggle, CTDS Audit results, and component analysis results
- **Tab 2: Chat** - Contained chat interface

## New Structure (Target)

- **Tab 1: CTDS Audit** - Run CTDS Audit button and results display
- **Tab 2: AI Analyze** - Component analysis only (quick actions with Analyze Component button, batch mode, component results)
- **Tab 3: AI Chat** - Chat interface (unchanged)
- **Tab 4: Settings** - All configuration options (always visible, not collapsible)

## Implementation Steps

### Step 1: Update Tab Navigation HTML

**Location:** Around line 2223-2231 in `[ui-enhanced.html](ui-enhanced.html)`

**Find:**

```html
<div class="tabs-navigation">
  <button class="tab-button active" id="tab-analyze" onclick="switchTab('analyze')">
    Analyze
  </button>
  <button class="tab-button" id="tab-chat" onclick="switchTab('chat')">
    Chat
  </button>
</div>
```

**Replace with:**

```html
<div class="tabs-navigation">
  <button class="tab-button active" id="tab-ctds-audit" onclick="switchTab('ctds-audit')">
    CTDS Audit
  </button>
  <button class="tab-button" id="tab-analyze" onclick="switchTab('analyze')">
    AI Analyze
  </button>
  <button class="tab-button" id="tab-chat" onclick="switchTab('chat')">
    AI Chat
  </button>
  <button class="tab-button" id="tab-settings" onclick="switchTab('settings')">
    Settings
  </button>
</div>
```

### Step 2: Create CTDS Audit Tab Content

**Location:** Insert BEFORE the existing "Tab Content: Analyze" section (before line ~2233)

**Add this new tab content:**

```html
<!-- Tab Content: CTDS Audit -->
<div class="tab-content active" id="content-ctds-audit">
  <div class="content">
    <!-- CTDS Audit Action -->
    <div class="quick-actions-bar" style="display: flex;">
      <button id="ctds-audit-button" class="button button-primary">
        <span>Run CTDS Audit</span>
      </button>
    </div>

    <!-- CTDS Audit Results -->
    <div id="ctds-audit-results" class="hidden">
      <div class="collapsible">
        <div class="collapsible-header active" onclick="toggleCollapsible(this)">
          <div class="collapsible-title">
            <span class="collapsible-icon">▶</span>
            <span>CTDS Audit Results</span>
            <div class="tooltip">
              <div class="info-icon">i</div>
              <span class="tooltiptext">
                <strong>CTDS Audit</strong><br>
                Design system-level validations that check your variable collections, text styles, and component variable bindings across the entire file.
              </span>
            </div>
          </div>
        </div>
        <div class="collapsible-content active" id="ctds-audit-content">
          <div class="skeleton"></div>
          <div class="skeleton" style="width: 80%;"></div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Step 3: Update AI Analyze Tab Content

**Location:** Update the existing "Tab Content: Analyze" section

**Change 1:** Update the opening div to remove `active` class:

```html
<!-- BEFORE -->
<div class="tab-content active" id="content-analyze">

<!-- AFTER -->
<div class="tab-content" id="content-analyze">
```

**Change 2:** Remove CTDS Audit button from quick-actions-bar (around line 2238-2246). Remove the show-config button too.

**Find:**

```html
<div class="quick-actions-bar" id="quick-actions" style="display: none;">
  <button id="quick-analyze-system" class="button button-secondary">
    <span>CTDS Audit</span>
  </button>
  <button id="quick-analyze-component" class="button button-primary">
    <span>Analyze Component</span>
  </button>
  <button id="show-config" class="button button-ghost" title="Show configuration">
    <!-- SVG content -->
  </button>
</div>
```

**Replace with:**

```html
<div class="quick-actions-bar" id="quick-actions" style="display: none;">
  <button id="quick-analyze-component" class="button button-primary">
    <span>Analyze Component</span>
  </button>
</div>
```

**Change 3:** Remove entire Settings collapsible section (around lines 2251-2337). This includes everything from `<!-- Settings (Collapsible) -->` through the closing `</div>` of the settings-card.

**Change 4:** Remove the "CTDS Audit Results" section (around lines 2344-2365). Find and delete:

```html
<!-- CTDS Audit Results (separate from component analysis) -->
<div id="system-results" class="hidden">
  <div class="collapsible">
    <div class="collapsible-header active" onclick="toggleCollapsible(this)">
      <div class="collapsible-title">
        <span class="collapsible-icon">▶</span>
        <span>CTDS Audit</span>
        <!-- tooltip content -->
      </div>
    </div>
    <div class="collapsible-content active" id="system-audit-content">
      <!-- skeleton loaders -->
    </div>
  </div>
</div>
```

### Step 4: Create Settings Tab Content

**Location:** Insert AFTER the Chat tab content (after line ~2503, before the Confirmation Modal)

**Add this new tab content:**

```html
<!-- Tab Content: Settings -->
<div class="tab-content" id="content-settings">
  <div class="content">
    <div class="settings-wrapper">
      <h2 style="margin-bottom: var(--spacing-05);">Settings</h2>
      
      <!-- Settings Card (always visible, no collapsible) -->
      <div id="settings-card">
        <div id="settings-content">
          <!-- Provider Selection -->
          <div class="form-group">
            <label for="provider-select">AI Provider</label>
            <select id="provider-select">
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="google">Google (Gemini)</option>
            </select>
            <p class="card-subtitle">Select your preferred AI provider for enhanced analysis</p>
          </div>

          <!-- Model Selection -->
          <div class="form-group">
            <label for="model-select"><span id="model-label">Claude</span> Model</label>
            <select id="model-select">
              <!-- Anthropic (Claude) Models -->
              <optgroup label="Anthropic (Claude)" id="anthropic-models">
                <option value="claude-opus-4-5-20251218">Claude Opus 4.5 (Flagship - Advanced Reasoning)</option>
                <option value="claude-sonnet-4-5-20250929" selected>Claude Sonnet 4.5 (Recommended - Best Value)</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fast - Economy)</option>
              </optgroup>
              <!-- OpenAI (GPT) Models -->
              <optgroup label="OpenAI (GPT)" id="openai-models" style="display: none;">
                <option value="gpt-5.2" disabled>GPT-5.2 (Flagship)</option>
                <option value="gpt-5.2-pro" disabled>GPT-5.2 Pro (Extended Reasoning)</option>
                <option value="gpt-5-mini" disabled>GPT-5 Mini (Fast - Economy)</option>
              </optgroup>
              <!-- Google (Gemini) Models -->
              <optgroup label="Google (Gemini)" id="google-models" style="display: none;">
                <option value="gemini-3-pro-preview" disabled>Gemini 3 Pro (Flagship - Multimodal)</option>
                <option value="gemini-2.5-pro" disabled>Gemini 2.5 Pro (Recommended)</option>
                <option value="gemini-2.5-flash" disabled>Gemini 2.5 Flash (Fast - Economy)</option>
              </optgroup>
            </select>
            <p class="card-subtitle">Choose the model for AI-powered analysis features</p>
          </div>

          <!-- API Key Input -->
          <div class="form-group">
            <label for="api-key"><span id="api-key-label">Claude</span> API Key</label>
            <div class="input-wrapper">
              <input
                type="password"
                id="api-key"
                placeholder="sk-ant-..."
                autocomplete="off"
              >
              <span class="input-icon">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 4v2h-.25A1.75 1.75 0 002 7.75v5.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-5.5A1.75 1.75 0 0012.25 6H12V4a4 4 0 10-8 0zm6 2V4a2 2 0 10-4 0v2h4zm-5.25 2h6.5a.25.25 0 01.25.25v5.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-5.5a.25.25 0 01.25-.25z"/>
                </svg>
              </span>
            </div>
            <p class="card-subtitle" id="api-key-hint">Required for AI-powered component analysis and chat features</p>
          </div>

          <!-- Action Buttons -->
          <div class="button-group mt-md">
            <button id="save-key" class="button button-primary">
              <span>Save Key</span>
            </button>
            <button id="clear-key" class="button button-secondary" style="display: none;">
              <span>Clear Key</span>
            </button>
          </div>

          <!-- Status Message -->
          <div id="status-container" class="hidden">
            <div class="status-banner" id="status">
              <span class="status-icon" id="status-icon"></span>
              <span id="status-text">Ready to analyze</span>
            </div>
          </div>
          
          <span id="settings-status-badge" class="status-badge" style="display: none;"></span>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Step 5: Update JavaScript Variable Declarations

**Location:** Around line 2784-2800 in the JavaScript section

**Find:**

```javascript
const settingsCard = document.getElementById('settings-card');
const settingsContent = document.getElementById('settings-content');
const settingsStatusBadge = document.getElementById('settings-status-badge');
const quickActions = document.getElementById('quick-actions');
const quickAnalyzeSystemButton = document.getElementById('quick-analyze-system');
const quickAnalyzeButton = document.getElementById('quick-analyze-component');
const showConfigButton = document.getElementById('show-config');

// Batch Mode Elements
const batchModeToggle = document.getElementById('batch-mode-toggle');
const batchModeSwitch = document.getElementById('batch-mode-switch');

// System Audit Results Elements
const systemResults = document.getElementById('system-results');
const systemAuditContent = document.getElementById('system-audit-content');
```

**Replace with:**

```javascript
const settingsCard = document.getElementById('settings-card');
const settingsContent = document.getElementById('settings-content');
const settingsStatusBadge = document.getElementById('settings-status-badge');
const quickActions = document.getElementById('quick-actions');
const quickAnalyzeButton = document.getElementById('quick-analyze-component');

// CTDS Audit Elements
const ctdsAuditButton = document.getElementById('ctds-audit-button');
const ctdsAuditResults = document.getElementById('ctds-audit-results');
const ctdsAuditContent = document.getElementById('ctds-audit-content');

// Batch Mode Elements
const batchModeToggle = document.getElementById('batch-mode-toggle');
const batchModeSwitch = document.getElementById('batch-mode-switch');
```

### Step 6: Update JavaScript Initial State

**Location:** Around line 2718

**Find:**

```javascript
let currentTab = 'analyze';
```

**Replace with:**

```javascript
let currentTab = 'ctds-audit';
```

### Step 7: Update Event Listeners

**Location:** Around line 3189-3220

**Find:**

```javascript
quickAnalyzeButton.addEventListener('click', handleAnalyzeComponent);
quickAnalyzeSystemButton.addEventListener('click', handleAnalyzeSystem);
```

**Replace with:**

```javascript
quickAnalyzeButton.addEventListener('click', handleAnalyzeComponent);
ctdsAuditButton.addEventListener('click', handleAnalyzeSystem);
```

**Also remove this entire block:**

```javascript
// Configuration visibility toggles
showConfigButton.addEventListener('click', () => {
  const settingsHeader = settingsCard.querySelector('.collapsible-header');
  if (settingsHeader && !settingsHeader.classList.contains('active')) {
    toggleCollapsible(settingsHeader);
  }
  // Scroll to settings card
  settingsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
```

### Step 8: Update switchTab Function

**Location:** Around line 3735-3756

**Find:**

```javascript
function switchTab(tabName) {
  // Update active tab button
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');

  // Update active tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`content-${tabName}`).classList.add('active');

  currentTab = tabName;

  // Update tab-specific UI
  if (tabName === 'chat') {
    updateChatInputState();
    updateChatComponentContext();
  }
}
```

**Replace with:**

```javascript
function switchTab(tabName) {
  // Update active tab button
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');

  // Update active tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`content-${tabName}`).classList.add('active');

  currentTab = tabName;

  // Update tab-specific UI
  if (tabName === 'chat') {
    updateChatInputState();
    updateChatComponentContext();
  } else if (tabName === 'ctds-audit') {
    // CTDS Audit tab initialization if needed
  } else if (tabName === 'settings') {
    // Settings tab initialization if needed
  }
}
```

### Step 9: Update showApiKeyPrompt Function

**Location:** Around line 3907-3920

**Find:**

```javascript
function showApiKeyPrompt(featureName) {
  updateStatus(`${featureName} requires an API key`, 'warning');
  
  // Expand settings card to show API key input
  const settingsHeader = settingsCard.querySelector('.collapsible-header');
  if (settingsHeader && !settingsHeader.classList.contains('active')) {
    toggleCollapsible(settingsHeader);
  }
  
  // Focus on API key input
  setTimeout(() => {
    apiKeyInput.focus();
  }, 300);
}
```

**Replace with:**

```javascript
function showApiKeyPrompt(featureName) {
  updateStatus(`${featureName} requires an API key`, 'warning');
  
  // Switch to settings tab
  switchTab('settings');
  
  // Focus on API key input
  setTimeout(() => {
    apiKeyInput.focus();
  }, 300);
}
```

### Step 10: Update handleAnalyzeSystem Function

**Location:** Around line 3950-3960

**Find:**

```javascript
// Hide component results, show system results
analysisResults.classList.add('hidden');
systemResults.classList.remove('hidden');

// Show loading state in system audit content
systemAuditContent.innerHTML = `
  <div class="skeleton"></div>
  <div class="skeleton" style="width: 80%;"></div>
  <div class="skeleton" style="width: 60%;"></div>
```

**Replace with:**

```javascript
// Hide component results, show CTDS audit results
analysisResults.classList.add('hidden');
ctdsAuditResults.classList.remove('hidden');

// Show loading state in CTDS audit content
ctdsAuditContent.innerHTML = `
  <div class="skeleton"></div>
  <div class="skeleton" style="width: 80%;"></div>
  <div class="skeleton" style="width: 60%;"></div>
```

### Step 11: Update handleSystemAuditResult Function

**Location:** Around line 4291-4295

**Find all instances of `systemAuditContent` and replace with `ctdsAuditContent`:**

```javascript
// BEFORE
systemAuditContent.innerHTML = `<div style="color: var(--error); padding: 8px;">Error: ${data.error}</div>`;

// AFTER
ctdsAuditContent.innerHTML = `<div style="color: var(--error); padding: 8px;">Error: ${data.error}</div>`;
```

**This replacement occurs in multiple places (around lines 4294, 4478, 5085, 5182).**

### Step 12: Update updateSystemAuditView Function

**Location:** Around line 5043-5045

**Find:**

```javascript
function updateSystemAuditView(audit) {
  const systemAuditContent = document.getElementById('system-audit-content');
  if (!systemAuditContent) return;
```

**Replace with:**

```javascript
function updateSystemAuditView(audit) {
  const ctdsAuditContentElement = document.getElementById('ctds-audit-content');
  if (!ctdsAuditContentElement) return;
```

### Step 13: Update handleClearApiKey Function

**Location:** Around line 3980-3995

**Find and remove the collapsible expansion code:**

```javascript
updateStatus('API key cleared', 'info');
sendMessageToPlugin('clear-api-key', {});

// Update UI to reflect no API key
settingsStatusBadge.textContent = '⚠️ AI features disabled';
settingsStatusBadge.style.color = 'var(--warning)';
clearKeyButton.style.display = 'none';

// Expand settings card
const settingsHeader = settingsCard.querySelector('.collapsible-header');
if (settingsHeader && !settingsHeader.classList.contains('active')) {
  toggleCollapsible(settingsHeader);
}
```

**Replace with:**

```javascript
updateStatus('API key cleared', 'info');
sendMessageToPlugin('clear-api-key', {});

// Update UI to reflect no API key
settingsStatusBadge.textContent = '⚠️ AI features disabled';
settingsStatusBadge.style.color = 'var(--warning)';
clearKeyButton.style.display = 'none';
```

### Step 14: Update handleSaveApiKey Success Handler

**Location:** Around line 4183-4193

**Find and remove collapsible collapse code:**

```javascript
settingsStatusBadge.textContent = '✓ Configured';
settingsStatusBadge.style.color = 'var(--success)';

// Show clear key button
clearKeyButton.style.display = 'inline-block';

// Collapse settings card
const settingsHeader = settingsCard.querySelector('.collapsible-header');
if (settingsHeader && settingsHeader.classList.contains('active')) {
  toggleCollapsible(settingsHeader);
}

// Enable chat tab
```

**Replace with:**

```javascript
settingsStatusBadge.textContent = '✓ Configured';
settingsStatusBadge.style.color = 'var(--success)';

// Show clear key button
clearKeyButton.style.display = 'inline-block';

// Enable chat tab
```

### Step 15: Update handleApiKeyStatus Function

**Location:** Around lines 4228-4257

**Remove two collapsible toggle blocks:**

**Block 1 (around line 4228-4233):**

```javascript
// REMOVE:
// Collapse settings card if it's currently expanded
const settingsHeader = settingsCard.querySelector('.collapsible-header');
if (settingsHeader && settingsHeader.classList.contains('active')) {
  toggleCollapsible(settingsHeader);
}
```

**Block 2 (around line 4252-4257):**

```javascript
// REMOVE:
// Expand settings card if it's currently collapsed
const settingsHeader = settingsCard.querySelector('.collapsible-header');
if (settingsHeader && !settingsHeader.classList.contains('active')) {
  toggleCollapsible(settingsHeader);
}
```

### Step 16: Update handleSendChat Function

**Location:** Around line 6306-6309

**Find:**

```javascript
if (!apiKeySaved) {
  showApiKeyPrompt('Chat');
  // Switch to analyze tab to show settings
  switchTab('analyze');
  return;
}
```

**Replace with:**

```javascript
if (!apiKeySaved) {
  showApiKeyPrompt('Chat');
  // Switch to settings tab to configure API key
  switchTab('settings');
  return;
}
```

## Summary of Changes

### HTML Structure Changes

1. Tab navigation updated from 2 to 4 buttons
2. New CTDS Audit tab added with button and results area
3. AI Analyze tab cleaned up (removed CTDS button, show-config button, settings section, and system-results section)
4. New Settings tab added with all configuration options (no longer collapsible)
5. Chat tab unchanged

### JavaScript Changes

1. Variable declarations updated: removed `quickAnalyzeSystemButton`, `showConfigButton`, `systemResults`, `systemAuditContent`; added `ctdsAuditButton`, `ctdsAuditResults`, `ctdsAuditContent`
2. Initial `currentTab` changed from 'analyze' to 'ctds-audit'
3. Event listener changed from `quickAnalyzeSystemButton` to `ctdsAuditButton`
4. Removed `showConfigButton` event listener entirely
5. Updated `switchTab()` to handle new tab names
6. Updated `showApiKeyPrompt()` to switch to settings tab instead of expanding collapsible
7. All collapsible toggle code removed from settings-related functions
8. All references to `systemResults` and `systemAuditContent` changed to `ctdsAuditResults` and `ctdsAuditContent`
9. Updated chat function to switch to 'settings' instead of 'analyze'

### Key Files Modified

- `[ui-enhanced.html](ui-enhanced.html)` - All changes in this single file

