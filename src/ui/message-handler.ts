/// <reference types="@figma/plugin-typings" />

import { sendMessageToUI } from '../utils/figma-helpers';
import { fetchPluginData, findComponents } from '../plugin/data-adapter';
import {
  validateCollectionStructure,
  validateTextStylesAgainstVariables,
  validateTextStyleBindings,
  validateAllComponentBindings
} from '../core/collection-validator';

/**
 * Main message handler for UI communication (CT/DS Audit only)
 */
export async function handleUIMessage(msg: any): Promise<void> {
  const { type } = msg;
  console.log('Received message:', type);

  try {
    switch (type) {
      case 'analyze-system':
        await handleSystemAudit();
        break;
      case 'analyze-variables-styles':
        await handleVariablesStylesAudit();
        break;
      case 'analyze-components':
        await handleComponentsAudit();
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    sendMessageToUI('system-audit-result', { error: errorMessage });
  }
}

/**
 * System audit (CT/DS Audit) - validates design system structure
 */
async function handleSystemAudit(): Promise<void> {
  try {
    console.log('🔍 Running CT/DS audit...');

    // Fetch all data once via the plugin adapter
    const data = await fetchPluginData();
    const components = findComponents(data.pages);

    // Run all system-level validations (now synchronous, data-driven)
    const collectionValidation = validateCollectionStructure(
      data.collections, data.variables
    );
    const textStyleSync = validateTextStylesAgainstVariables(
      data.collections, data.variables, data.textStyles
    );
    const textStyleBindings = validateTextStyleBindings(
      data.textStyles, data.variables
    );
    const componentBindings = validateAllComponentBindings(
      components,
      (message) => {
        figma.ui.postMessage({ type: 'audit-progress', data: { message } });
      }
    );

    // Combine text style checks
    const combinedTextStyleSync = [
      ...textStyleSync.auditChecks,
      ...textStyleBindings.auditChecks
    ];

    // Calculate scores for each section with detailed counts
    const allChecks = [
      ...collectionValidation.auditChecks,
      ...combinedTextStyleSync,
      ...componentBindings.auditChecks
    ];

    const overallStats = calculateAuditStats(allChecks);
    const collectionStats = calculateAuditStats(collectionValidation.auditChecks);
    const textStyleStats = calculateAuditStats(combinedTextStyleSync);
    const componentStats = calculateComponentStats(componentBindings.auditChecks);

    // Send results to UI
    sendMessageToUI('system-audit-result', {
      collectionStructure: collectionValidation.auditChecks,
      textStyleSync: combinedTextStyleSync,
      componentBindings: componentBindings.auditChecks,
      scores: {
        overall: overallStats,
        collection: collectionStats,
        textStyle: textStyleStats,
        component: componentStats
      }
    });

    console.log('✅ CT/DS audit complete');
  } catch (error) {
    console.error('❌ CT/DS audit error:', error);
    sendMessageToUI('system-audit-result', {
      error: error instanceof Error ? error.message : 'Unknown error during system audit'
    });
  }
}

/**
 * Variables & Styles audit - validates collections and text styles only
 */
async function handleVariablesStylesAudit(): Promise<void> {
  try {
    console.log('🔍 Running Variables & Styles audit...');

    const data = await fetchPluginData();

    const collectionValidation = validateCollectionStructure(
      data.collections, data.variables
    );
    const textStyleSync = validateTextStylesAgainstVariables(
      data.collections, data.variables, data.textStyles
    );
    const textStyleBindings = validateTextStyleBindings(
      data.textStyles, data.variables
    );

    // Combine text style checks
    const combinedTextStyleSync = [
      ...textStyleSync.auditChecks,
      ...textStyleBindings.auditChecks
    ];

    // Calculate scores for each section
    const allChecks = [
      ...collectionValidation.auditChecks,
      ...combinedTextStyleSync
    ];

    const overallStats = calculateAuditStats(allChecks);
    const collectionStats = calculateAuditStats(collectionValidation.auditChecks);
    const textStyleStats = calculateAuditStats(combinedTextStyleSync);

    // Send results to UI
    sendMessageToUI('variables-styles-audit-result', {
      collectionStructure: collectionValidation.auditChecks,
      textStyleSync: combinedTextStyleSync,
      scores: {
        overall: overallStats,
        collection: collectionStats,
        textStyle: textStyleStats
      }
    });

    console.log('✅ Variables & Styles audit complete');
  } catch (error) {
    console.error('❌ Variables & Styles audit error:', error);
    sendMessageToUI('variables-styles-audit-result', {
      error: error instanceof Error ? error.message : 'Unknown error during Variables & Styles audit'
    });
  }
}

/**
 * Components audit - validates component bindings only
 */
async function handleComponentsAudit(): Promise<void> {
  try {
    console.log('🔍 Running Components audit...');

    const data = await fetchPluginData();
    const components = findComponents(data.pages);

    const componentBindings = validateAllComponentBindings(
      components,
      (message) => {
        figma.ui.postMessage({ type: 'audit-progress', data: { message } });
      }
    );

    // Calculate score using component-specific stats (pass/fail only)
    const componentStats = calculateComponentStats(componentBindings.auditChecks);

    // Send results to UI
    sendMessageToUI('components-audit-result', {
      componentBindings: componentBindings.auditChecks,
      scores: {
        component: componentStats
      }
    });

    console.log('✅ Components audit complete');
  } catch (error) {
    console.error('❌ Components audit error:', error);
    sendMessageToUI('components-audit-result', {
      error: error instanceof Error ? error.message : 'Unknown error during Components audit'
    });
  }
}

/**
 * Calculate audit statistics from checks (pass/fail only)
 */
function calculateAuditStats(checks: any[]): { score: number; passed: number; warnings: number; failed: number; total: number } {
  if (checks.length === 0) {
    return { score: 100, passed: 0, warnings: 0, failed: 0, total: 0 };
  }

  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);

  // Keep warnings in response for backward compatibility, but should always be 0
  return { score, passed, warnings: 0, failed, total };
}

/**
 * Calculate component audit statistics (pass/fail only, no warnings)
 */
function calculateComponentStats(checks: any[]): { score: number; passed: number; failed: number; total: number } {
  if (checks.length === 0) {
    return { score: 100, passed: 0, failed: 0, total: 0 };
  }

  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);

  return { score, passed, failed, total };
}

/**
 * Initialize plugin
 */
export function initializePlugin(): void {
  console.log('🚀 ctdsLint initialized (CT/DS Audit only)');
}
