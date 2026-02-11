---
name: Recreate API Test Feature
overview: Recreate the Test API Key feature from documentation, including UI button, handlers, backend logic, debug logging, and comprehensive testing
todos:
  - id: add-ui-button
    content: Add Test Key button and result elements to UI HTML
    status: pending
  - id: add-ui-references
    content: Add element references and input protection flag in JavaScript
    status: pending
  - id: update-input-handler
    content: Update handleApiKeyChange with input protection and button state
    status: pending
  - id: fix-provider-handler
    content: Fix handleProviderChange to prevent clearing user input
    status: pending
  - id: add-test-handler-ui
    content: Add handleTestApiKey function and updateTestResult helper
    status: pending
  - id: add-event-listener
    content: Add event listener for Test Key button
    status: pending
  - id: add-message-receiver
    content: Add test-api-key-result case to message receiver
    status: pending
  - id: add-backend-type
    content: Add test-api-key to UIMessageType in types.ts
    status: pending
  - id: add-backend-case
    content: Add test-api-key case to message handler switch
    status: pending
  - id: add-backend-function
    content: Add handleTestApiKey and helper functions to message-handler.ts
    status: pending
  - id: build-plugin
    content: Build plugin with npm run build
    status: pending
  - id: test-valid-key
    content: Test with valid API key
    status: pending
  - id: test-invalid-key
    content: Test with invalid API key
    status: pending
  - id: test-provider-switching
    content: Test provider switching preserves input
    status: pending
  - id: verify-debug-logging
    content: Verify debug logging appears in console
    status: pending
isProject: false
---

# Recreate API Key Testing Feature

## Overview

Recreate the "Test API Key" feature that was documented but lost during the git reset. This includes UI changes, backend handlers, debug logging, and input protection fixes.

## Changes Required

### 1. UI Changes in `[ui-enhanced.html](ui-enhanced.html)`

#### A. Add Test Key Button (after line 2314)

Add a "Test Key" button next to the "Save Key" button in the Settings tab:

```html
<div class="button-group mt-md">
  <button id="test-key" class="button button-secondary">
    <span>Test Key</span>
  </button>
  <button id="save-key" class="button button-secondary">
    <span>Save Key</span>
  </button>
  <button id="analyze-component" class="button button-primary" disabled>
    <span>Analyze Component</span>
  </button>
</div>
```

Add test result display area after the button group:

```html
<div id="test-result" class="status-banner hidden" style="margin-top: 1rem;"></div>
<textarea id="test-error-details" class="hidden" readonly style="margin-top: 0.5rem; font-family: monospace; font-size: 12px; width: 100%; min-height: 100px;"></textarea>
```

#### B. Add Element References (around line 2735)

```javascript
const testKeyButton = document.getElementById('test-key');
const testResult = document.getElementById('test-result');
const testErrorDetails = document.getElementById('test-error-details');
```

#### C. Add Input Protection Flag (around line 2796)

```javascript
let userIsEditingKey = false; // Track if user is actively editing API key
```

#### D. Update handleApiKeyChange Function (around line 3815)

Add input protection logic:

```javascript
function handleApiKeyChange() {
  const hasKey = apiKeyInput.value.trim().length > 0;
  saveKeyButton.disabled = !hasKey;
  testKeyButton.disabled = !hasKey;
  
  // Input protection
  userIsEditingKey = true;
  clearTimeout(window.keyEditTimeout);
  window.keyEditTimeout = setTimeout(() => {
    userIsEditingKey = false;
  }, 2000);
}
```

#### E. Fix handleProviderChange Function (around line 3817)

Add logic to prevent clearing user input:

```javascript
function handleProviderChange() {
  const selectedProvider = providerSelect.value;
  const config = providerConfig[selectedProvider];
  
  if (!config) return;
  
  // Store current provider before updating
  const oldProvider = window.currentProvider || selectedProvider;
  
  // Only proceed if actually changing providers
  if (oldProvider === selectedProvider && window.currentProvider) {
    // Same provider - just update UI, don't touch input
    if (apiKeyLabel) apiKeyLabel.textContent = config.name;
    if (modelLabel) modelLabel.textContent = config.name;
    return;
  }
  
  window.currentProvider = selectedProvider;
  
  // Store current key in temporary storage before switching
  if (oldProvider && oldProvider !== selectedProvider) {
    providerApiKeys[oldProvider] = apiKeyInput.value;
  }
  
  // Update labels and hints
  if (apiKeyLabel) apiKeyLabel.textContent = config.name;
  if (modelLabel) modelLabel.textContent = config.name;
  if (apiKeyInput) apiKeyInput.placeholder = config.placeholder;
  if (apiKeyHint) apiKeyHint.textContent = config.hint;
  
  // Check if we should restore saved key
  const inputIsEmpty = !apiKeyInput.value || apiKeyInput.value.trim().length === 0;
  const inputIsPlaceholder = apiKeyInput.value === config.placeholder;
  
  // Only restore saved key if conditions are met
  if (!userIsEditingKey) {
    if (inputIsEmpty || inputIsPlaceholder || oldProvider !== selectedProvider) {
      apiKeyInput.value = providerApiKeys[selectedProvider] || '';
    }
  }
  
  // Update model dropdown visibility
  const providerGroups = {
    anthropic: document.getElementById('anthropic-models'),
    openai: document.getElementById('openai-models'),
    google: document.getElementById('google-models')
  };
  
  Object.entries(providerGroups).forEach(([key, group]) => {
    if (!group) return;
    const isActive = key === selectedProvider;
    group.style.display = isActive ? '' : 'none';
    Array.from(group.querySelectorAll('option')).forEach(opt => {
      opt.disabled = !isActive;
    });
  });
  
  // Select default model for this provider
  modelSelect.value = config.defaultModel;
  
  // Update button state
  const hasKey = apiKeyInput.value.trim().length > 0;
  updateAnalyzeButtonState(hasKey && apiKeySaved);
  
  console.log('Provider changed to:', selectedProvider, 'Model:', config.defaultModel);
}
```

#### F. Add handleTestApiKey Function (after handleSaveApiKey, around line 3889)

```javascript
function handleTestApiKey() {
  const apiKey = apiKeyInput.value.trim();
  const selectedModel = modelSelect.value;
  const selectedProvider = providerSelect ? providerSelect.value : 'anthropic';
  
  if (!apiKey) {
    updateTestResult('Please enter an API key to test', 'error');
    return;
  }
  
  // Hide previous results
  testResult.classList.add('hidden');
  testErrorDetails.classList.add('hidden');
  
  // DEBUG: Log key info (masked for security)
  const keyPreview = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
  console.log('Testing API key:', {
    provider: selectedProvider,
    model: selectedModel,
    keyLength: apiKey.length,
    keyPreview: keyPreview,
    keyFormat: apiKey.substring(0, 7)
  });
  
  testKeyButton.disabled = true;
  testKeyButton.innerHTML = '<span>Testing...</span>';
  
  sendMessageToPlugin('test-api-key', {
    apiKey,
    model: selectedModel,
    provider: selectedProvider
  });
}

function updateTestResult(message, type) {
  testResult.textContent = message;
  testResult.className = `status-banner status-${type}`;
  testResult.classList.remove('hidden');
}
```

#### G. Add Event Listener (around line 3175)

```javascript
testKeyButton.addEventListener('click', handleTestApiKey);
```

#### H. Add Test Result Handler in Message Receiver (around line 4100)

```javascript
case 'test-api-key-result':
  testKeyButton.disabled = false;
  testKeyButton.innerHTML = '<span>Test Key</span>';
  
  if (data.success) {
    updateTestResult('✓ Valid Key', 'success');
    testErrorDetails.classList.add('hidden');
  } else {
    updateTestResult(`✗ Invalid Key: ${data.error}`, 'error');
    
    // Show error details in textarea
    if (data.details) {
      testErrorDetails.value = data.details;
      testErrorDetails.classList.remove('hidden');
    }
  }
  break;
```

### 2. Backend Changes in `[src/ui/message-handler.ts](src/ui/message-handler.ts)`

#### A. Add Message Type to Switch Statement (around line 96)

```typescript
case 'test-api-key':
  await handleTestApiKey(data.apiKey, data.model, data.provider);
  break;
```

#### B. Add handleTestApiKey Function (after handleSaveApiKey, around line 240)

```typescript
/**
 * Test API key without saving
 */
async function handleTestApiKey(apiKey: string, model?: string, provider?: string): Promise<void> {
  try {
    console.log('Testing API key...');
    
    const testProvider = provider || selectedProvider;
    const testModel = model || selectedModel;
    
    // Validate API key format
    if (!isValidApiKeyFormat(apiKey, testProvider)) {
      const expectedFormat = getExpectedKeyFormat(testProvider);
      sendMessageToUI('test-api-key-result', {
        success: false,
        error: `Invalid API key format. Expected format: ${expectedFormat}`,
        details: `Provider: ${testProvider}\nModel: ${testModel}\nExpected format: ${expectedFormat}`
      });
      return;
    }
    
    // DEBUG: Log key format check
    console.log('Key format check:', {
      length: apiKey.length,
      prefix: apiKey.substring(0, 7),
      trimmedLength: apiKey.trim().length,
      suffix: apiKey.substring(apiKey.length - 4)
    });
    
    // Test the API key with a minimal request
    const testPrompt = 'Reply with just the word "success" and nothing else.';
    const response = await callLLMAPI(apiKey, testModel, testProvider, testPrompt);
    
    if (response && response.trim().length > 0) {
      figma.notify(`${getProviderName(testProvider)} API key is valid`);
      sendMessageToUI('test-api-key-result', {
        success: true,
        provider: testProvider,
        model: testModel
      });
    } else {
      throw new Error('Empty response from API');
    }
  } catch (error: any) {
    console.error('API key test failed:', error);
    
    const errorDetails = [
      `Error: ${error.message || 'Unknown error'}`,
      error.code ? `Code: ${error.code}` : '',
      error.status ? `Status: ${error.status}` : '',
      `Provider: ${provider || selectedProvider}`,
      `Model: ${model || selectedModel}`
    ].filter(Boolean).join('\n');
    
    sendMessageToUI('test-api-key-result', {
      success: false,
      error: error.message || 'API key validation failed',
      details: errorDetails
    });
  }
}

/**
 * Get expected key format for a provider
 */
function getExpectedKeyFormat(provider: string): string {
  switch (provider) {
    case 'anthropic':
      return 'sk-ant-...';
    case 'openai':
      return 'sk-...';
    case 'google':
      return 'AIza...';
    default:
      return 'Valid API key';
  }
}

/**
 * Get display name for a provider
 */
function getProviderName(provider: string): string {
  switch (provider) {
    case 'anthropic':
      return 'Claude';
    case 'openai':
      return 'OpenAI';
    case 'google':
      return 'Gemini';
    default:
      return provider;
  }
}
```

### 3. Type Definition in `[src/types.ts](src/types.ts)`

Add 'test-api-key' to UIMessageType union (around line 10):

```typescript
export type UIMessageType = 
  | 'check-api-key'
  | 'save-api-key'
  | 'test-api-key'  // ADD THIS
  | 'update-model'
  // ... rest of types
```

### 4. Build and Test

#### Build Steps

1. Run `npm run build` to compile TypeScript and bundle
2. Verify no build errors
3. Check that `dist/code.js` and `dist/ui-enhanced.html` are updated

#### Manual Testing in Figma

1. Reload plugin in Figma
2. Open browser DevTools console
3. Navigate to Settings tab
4. Verify Test Key button appears next to Save Key
5. Test with valid Anthropic key:
  - Enter valid key (sk-ant-...)
  - Click "Test Key"
  - Should see "Testing..." then "✓ Valid Key"
  - Check console for debug output
6. Test with invalid key:
  - Enter invalid key
  - Click "Test Key"
  - Should see error message with details textarea
  - Verify error details are copyable
7. Test provider switching:
  - Type key for one provider
  - Switch providers
  - Verify typed key is preserved (not cleared)
8. Test empty key:
  - Clear input field
  - Verify Test Key button is disabled
9. Test all three providers (Anthropic, OpenAI, Google)

### 5. Validation Checklist

- Test Key button renders correctly in UI
- Button is disabled when input is empty
- Button shows "Testing..." during API call
- Valid keys show success message
- Invalid keys show error message with details
- Error details are displayed in copyable textarea
- Provider switching doesn't clear typed input
- Debug logging appears in console (UI and backend)
- All three providers work correctly
- Build completes without errors
- No TypeScript compilation errors
- No linter errors introduced

## Files Modified Summary

1. `[ui-enhanced.html](ui-enhanced.html)` - Add Test Key button, handlers, input protection
2. `[src/ui/message-handler.ts](src/ui/message-handler.ts)` - Add test handler and API call logic
3. `[src/types.ts](src/types.ts)` - Add 'test-api-key' message type
4. `[dist/code.js](dist/code.js)` - Auto-generated by build
5. `[dist/ui-enhanced.html](dist/ui-enhanced.html)` - Auto-generated by build

## Success Criteria

All validation checklist items pass, and the feature works as documented in `API-KEY-FIX-SUMMARY.md` and `TEST-API-KEY-FEATURE.md`.