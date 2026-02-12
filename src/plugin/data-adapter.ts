/// <reference types="@figma/plugin-typings" />

/**
 * Adapter that fetches data from the Figma Plugin API and converts it
 * into the API-agnostic types consumed by the core validators.
 */

import type {
  LintVariable,
  LintVariableCollection,
  LintVariableAlias,
  LintVariableValue,
  LintTextStyle,
  LintBoundVariable,
  LintNode,
  LintComponent,
  LintPaint,
  LintSolidPaint,
  LintOtherPaint,
  LintEffect,
  LintRGBA,
  LintLineHeight,
  LintLetterSpacing,
  LintData,
} from '../shared/types';

// ============================================================================
// Variable / Collection Adapters
// ============================================================================

function adaptVariableValue(value: VariableValue): LintVariableValue {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  // VariableAlias
  if (typeof value === 'object' && 'type' in value && (value as VariableAlias).type === 'VARIABLE_ALIAS') {
    const alias = value as VariableAlias;
    return { type: 'VARIABLE_ALIAS', id: alias.id } satisfies LintVariableAlias;
  }
  // RGB / RGBA color
  if (typeof value === 'object' && 'r' in value) {
    const color = value as RGBA;
    return { r: color.r, g: color.g, b: color.b, a: 'a' in color ? color.a : 1 };
  }
  return String(value);
}

function adaptVariable(variable: Variable): LintVariable {
  const valuesByMode: Record<string, LintVariableValue> = {};
  for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
    valuesByMode[modeId] = adaptVariableValue(value);
  }
  return {
    id: variable.id,
    name: variable.name,
    variableCollectionId: variable.variableCollectionId,
    valuesByMode,
  };
}

function adaptCollection(collection: VariableCollection): LintVariableCollection {
  return {
    id: collection.id,
    name: collection.name,
  };
}

// ============================================================================
// Text Style Adapter
// ============================================================================

function adaptTextStyle(style: TextStyle): LintTextStyle {
  const boundVariables: Record<string, LintBoundVariable | undefined> = {};
  const bv = (style as any).boundVariables || {};
  for (const [key, binding] of Object.entries(bv)) {
    if (binding && typeof binding === 'object' && 'id' in (binding as any)) {
      boundVariables[key] = { id: (binding as any).id };
    }
  }
  return {
    name: style.name,
    boundVariables,
  };
}

// ============================================================================
// Node Adapter
// ============================================================================

function adaptColor(color: RGB | RGBA): LintRGBA {
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: 'a' in color ? color.a : 1,
  };
}

function adaptPaint(paint: Paint): LintPaint {
  if (paint.type === 'SOLID') {
    const solid = paint as SolidPaint;
    return {
      type: 'SOLID',
      color: adaptColor(solid.color),
      visible: solid.visible !== false,
    } satisfies LintSolidPaint;
  }
  return {
    type: paint.type,
    visible: (paint as any).visible !== false,
  } satisfies LintOtherPaint;
}

function adaptEffect(effect: Effect): LintEffect {
  const result: LintEffect = {
    type: effect.type,
    visible: 'visible' in effect ? (effect as any).visible !== false : true,
  };
  if ((effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') && 'color' in effect) {
    result.color = adaptColor((effect as DropShadowEffect).color);
  }
  return result;
}

function adaptLineHeight(lh: LineHeight): LintLineHeight | 'MIXED' {
  if (typeof lh === 'symbol') return 'MIXED';
  if (lh.unit === 'AUTO') return { value: 0, unit: 'AUTO' };
  return { value: lh.value, unit: lh.unit === 'PERCENT' ? 'PERCENT' : 'PIXELS' };
}

function adaptLetterSpacing(ls: LetterSpacing): LintLetterSpacing | 'MIXED' {
  if (typeof ls === 'symbol') return 'MIXED';
  return { value: ls.value, unit: ls.unit === 'PERCENT' ? 'PERCENT' : 'PIXELS' };
}

function adaptBoundVariables(node: SceneNode): LintNode['boundVariables'] {
  const bv = (node as any).boundVariables || {};
  const result: LintNode['boundVariables'] = {};

  for (const [key, binding] of Object.entries(bv)) {
    if (Array.isArray(binding)) {
      result[key] = binding
        .map((b: any) => (b && b.id ? { id: b.id } : undefined))
        .filter(Boolean) as LintBoundVariable[];
    } else if (binding && typeof binding === 'object' && 'id' in (binding as any)) {
      result[key] = { id: (binding as any).id };
    }
  }

  return result;
}

function adaptNode(node: SceneNode): LintNode {
  const result: LintNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    boundVariables: adaptBoundVariables(node),
  };

  // Fills / strokes
  if ('fills' in node && Array.isArray(node.fills)) {
    result.fills = (node.fills as readonly Paint[]).map(adaptPaint);
  }
  if ('strokes' in node && Array.isArray(node.strokes)) {
    result.strokes = (node.strokes as readonly Paint[]).map(adaptPaint);
  }

  // Effects
  if ('effects' in node && Array.isArray(node.effects)) {
    result.effects = (node.effects as readonly Effect[]).map(adaptEffect);
  }

  // Corner radius
  if ('cornerRadius' in node) {
    const cr = (node as any).cornerRadius;
    result.cornerRadius = typeof cr === 'number' ? cr : 'MIXED';
  }

  // Auto-layout
  if ('layoutMode' in node) {
    result.layoutMode = (node as any).layoutMode || 'NONE';
  }
  if ('paddingTop' in node) result.paddingTop = (node as any).paddingTop;
  if ('paddingRight' in node) result.paddingRight = (node as any).paddingRight;
  if ('paddingBottom' in node) result.paddingBottom = (node as any).paddingBottom;
  if ('paddingLeft' in node) result.paddingLeft = (node as any).paddingLeft;
  if ('itemSpacing' in node) result.itemSpacing = (node as any).itemSpacing;

  // Typography (TEXT nodes)
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    result.fontSize = typeof textNode.fontSize === 'number' ? textNode.fontSize : 'MIXED';
    const lh = textNode.lineHeight;
    if (lh && typeof lh === 'object' && 'unit' in lh) {
      result.lineHeight = adaptLineHeight(lh);
    }
    const ls = textNode.letterSpacing;
    if (ls && typeof ls === 'object' && 'unit' in ls) {
      result.letterSpacing = adaptLetterSpacing(ls);
    }
  }

  // Children
  if ('children' in node) {
    result.children = (node as any).children.map((child: SceneNode) => adaptNode(child));
  }

  return result;
}

// ============================================================================
// Public: Fetch all data from the Figma Plugin API
// ============================================================================

/**
 * Gather all data needed for the full audit from the Figma Plugin API.
 *
 * The caller (message-handler) invokes this once and then passes the
 * resulting `LintData` to whichever validators are needed.
 */
export async function fetchPluginData(): Promise<LintData> {
  // Variables & collections
  const rawCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const rawVariables = await figma.variables.getLocalVariablesAsync();

  const collections = rawCollections.map(adaptCollection);
  const variables = rawVariables.map(adaptVariable);

  // Text styles
  const rawTextStyles = await figma.getLocalTextStylesAsync();
  const textStyles = rawTextStyles.map(adaptTextStyle);

  // Pages & node tree – load all pages for component scanning
  await figma.loadAllPagesAsync();
  const pages: LintData['pages'] = figma.root.children.map(page => ({
    name: page.name,
    children: page.children.map(child => adaptNode(child)),
  }));

  return { collections, variables, textStyles, pages };
}

/**
 * Walk the adapted page tree and return all components annotated with
 * their containing page name.
 */
export function findComponents(pages: LintData['pages']): LintComponent[] {
  const components: LintComponent[] = [];

  function walk(node: LintNode, pageName: string): void {
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      components.push({ node, pageName });
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child, pageName);
      }
    }
  }

  for (const page of pages) {
    for (const child of page.children) {
      walk(child, page.name);
    }
  }

  return components;
}
