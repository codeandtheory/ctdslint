/**
 * Component Complexity Analyzer
 *
 * Computes design-equivalent complexity metrics for Figma components:
 *
 *   - Structural: node count, depth, fan-out, type distribution
 *   - Cyclomatic: variant/property-driven decision paths
 *   - Halstead:   operator/operand vocabulary and volume
 *   - Composite:  weighted 0–100 summary score
 *
 * The analyser operates on the platform-agnostic `LintNode` type so it
 * works identically for both the Plugin and CLI adapters.
 */

import type {
  LintNode,
  LintComponent,
  StructuralMetrics,
  CyclomaticMetrics,
  HalsteadMetrics,
  ComponentComplexityResult,
} from '../shared/types';

// ============================================================================
// Structural Metrics
// ============================================================================

function computeStructuralMetrics(root: LintNode): StructuralMetrics {
  let nodeCount = 0;
  let leafCount = 0;
  let maxDepth = 0;
  let maxFanOut = 0;
  const typeDistribution: Record<string, number> = {};

  function walk(node: LintNode, depth: number): void {
    nodeCount++;
    typeDistribution[node.type] = (typeDistribution[node.type] ?? 0) + 1;

    if (depth > maxDepth) {
      maxDepth = depth;
    }

    const children = node.children ?? [];
    if (children.length === 0) {
      leafCount++;
    } else {
      if (children.length > maxFanOut) {
        maxFanOut = children.length;
      }
      for (const child of children) {
        walk(child, depth + 1);
      }
    }
  }

  walk(root, 0);

  return {
    nodeCount,
    maxDepth,
    leafCount,
    maxFanOut,
    uniqueTypes: Object.keys(typeDistribution).length,
    typeDistribution,
  };
}

// ============================================================================
// Cyclomatic Complexity (design equivalent)
// ============================================================================

/**
 * For design components the "decision paths" are:
 *   - Each variant option in a COMPONENT_SET adds a path
 *   - Each BOOLEAN property adds a binary branch
 *   - Each INSTANCE_SWAP property adds a branch
 *   - Each TEXT property adds a content branch
 *
 * We start with a base of 1 (the component itself) and add from there.
 * Property definitions can live on the root or on nested COMPONENT nodes,
 * so we walk the full subtree.
 */
function computeCyclomaticMetrics(root: LintNode): CyclomaticMetrics {
  let variants = 0;
  let booleanProps = 0;
  let instanceSwaps = 0;
  let textProps = 0;

  function walk(node: LintNode): void {
    if (node.componentPropertyDefinitions) {
      for (const def of Object.values(node.componentPropertyDefinitions)) {
        switch (def.type) {
          case 'VARIANT':
            // Each variant option beyond the first is an additional path
            variants += (def.variantOptions?.length ?? 1);
            break;
          case 'BOOLEAN':
            booleanProps++;
            break;
          case 'INSTANCE_SWAP':
            instanceSwaps++;
            break;
          case 'TEXT':
            textProps++;
            break;
        }
      }
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(root);

  const score = 1 + variants + booleanProps + instanceSwaps + textProps;

  return {
    score,
    breakdown: { variants, booleanProps, instanceSwaps, textProps },
  };
}

// ============================================================================
// Halstead Complexity (design equivalent)
// ============================================================================

/**
 * Operators are structural constructs that *do* something in the design:
 *   node types, layout modes, effect types, blend modes, constraint types
 *
 * Operands are the concrete values those constructs act upon:
 *   colours, font sizes, spacing values, corner radii, opacity, stroke weight
 */
function computeHalsteadMetrics(root: LintNode): HalsteadMetrics {
  const operatorBag: string[] = [];
  const operandBag: string[] = [];

  function walk(node: LintNode): void {
    // -- Operators --
    operatorBag.push(`type:${node.type}`);

    if (node.layoutMode && node.layoutMode !== 'NONE') {
      operatorBag.push(`layout:${node.layoutMode}`);
    }
    if (node.layoutSizingHorizontal) {
      operatorBag.push(`sizingH:${node.layoutSizingHorizontal}`);
    }
    if (node.layoutSizingVertical) {
      operatorBag.push(`sizingV:${node.layoutSizingVertical}`);
    }
    if (node.blendMode && node.blendMode !== 'PASS_THROUGH') {
      operatorBag.push(`blend:${node.blendMode}`);
    }
    if (node.constraints) {
      operatorBag.push(`constraintH:${node.constraints.horizontal}`);
      operatorBag.push(`constraintV:${node.constraints.vertical}`);
    }
    if (node.effects) {
      for (const e of node.effects) {
        if (e.visible) {
          operatorBag.push(`effect:${e.type}`);
        }
      }
    }

    // -- Operands --
    if (node.fills) {
      for (const f of node.fills) {
        if (f.visible && f.type === 'SOLID' && 'color' in f) {
          const c = f.color;
          operandBag.push(`color:${c.r.toFixed(2)},${c.g.toFixed(2)},${c.b.toFixed(2)},${c.a.toFixed(2)}`);
        }
      }
    }
    if (node.strokes) {
      for (const s of node.strokes) {
        if (s.visible && s.type === 'SOLID' && 'color' in s) {
          const c = s.color;
          operandBag.push(`strokeColor:${c.r.toFixed(2)},${c.g.toFixed(2)},${c.b.toFixed(2)},${c.a.toFixed(2)}`);
        }
      }
    }
    if (node.effects) {
      for (const e of node.effects) {
        if (e.visible && e.color) {
          operandBag.push(`effectColor:${e.color.r.toFixed(2)},${e.color.g.toFixed(2)},${e.color.b.toFixed(2)},${e.color.a.toFixed(2)}`);
        }
      }
    }

    if (node.cornerRadius !== undefined && node.cornerRadius !== 'MIXED') {
      operandBag.push(`radius:${node.cornerRadius}`);
    }
    if (node.opacity !== undefined && node.opacity !== 1) {
      operandBag.push(`opacity:${node.opacity}`);
    }
    if (node.strokeWeight !== undefined && node.strokeWeight > 0) {
      operandBag.push(`strokeWeight:${node.strokeWeight}`);
    }
    if (node.fontSize !== undefined && node.fontSize !== 'MIXED') {
      operandBag.push(`fontSize:${node.fontSize}`);
    }
    if (node.paddingTop !== undefined) operandBag.push(`paddingTop:${node.paddingTop}`);
    if (node.paddingRight !== undefined) operandBag.push(`paddingRight:${node.paddingRight}`);
    if (node.paddingBottom !== undefined) operandBag.push(`paddingBottom:${node.paddingBottom}`);
    if (node.paddingLeft !== undefined) operandBag.push(`paddingLeft:${node.paddingLeft}`);
    if (node.itemSpacing !== undefined) operandBag.push(`itemSpacing:${node.itemSpacing}`);

    // Recurse
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(root);

  const n1 = new Set(operatorBag).size;  // unique operators
  const n2 = new Set(operandBag).size;   // unique operands
  const N1 = operatorBag.length;          // total operators
  const N2 = operandBag.length;           // total operands

  const vocabulary = n1 + n2;
  const length = N1 + N2;
  const volume = length > 0 && vocabulary > 0
    ? length * Math.log2(vocabulary)
    : 0;
  const difficulty = n2 > 0
    ? (n1 / 2) * (N2 / n2)
    : 0;
  const effort = difficulty * volume;

  return {
    vocabulary,
    length,
    volume: Math.round(volume * 10) / 10,
    difficulty: Math.round(difficulty * 10) / 10,
    effort: Math.round(effort * 10) / 10,
    operators: { unique: n1, total: N1 },
    operands: { unique: n2, total: N2 },
  };
}

// ============================================================================
// Composite Score
// ============================================================================

/**
 * Produce a 0–100 composite score from the individual metrics.
 *
 * The formula is intentionally simple and tuneable:
 *   - 30 % structural (node count + depth, log-scaled)
 *   - 30 % cyclomatic
 *   - 40 % Halstead volume (log-scaled)
 *
 * Each dimension is clamped to [0, 100] before weighting so one
 * extreme axis can't dominate.
 */
function computeCompositeScore(
  structural: StructuralMetrics,
  cyclomatic: CyclomaticMetrics,
  halstead: HalsteadMetrics,
): number {
  // Structural: log-scale node count (1 node = 0, ~500 nodes = 100)
  const structuralScore = Math.min(
    100,
    (Math.log2(structural.nodeCount + 1) / Math.log2(500)) * 70 +
    (structural.maxDepth / 15) * 30,
  );

  // Cyclomatic: 1 = trivial (0), ~20 = very complex (100)
  const cyclomaticScore = Math.min(100, ((cyclomatic.score - 1) / 19) * 100);

  // Halstead: log-scale volume
  const halsteadScore = halstead.volume > 0
    ? Math.min(100, (Math.log2(halstead.volume) / Math.log2(5000)) * 100)
    : 0;

  const composite =
    structuralScore * 0.3 +
    cyclomaticScore * 0.3 +
    halsteadScore * 0.4;

  return Math.round(Math.min(100, Math.max(0, composite)));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Analyse a single component node and return its complexity result.
 */
export function analyzeComponentComplexity(
  component: LintComponent,
): ComponentComplexityResult {
  const { node } = component;

  const structural = computeStructuralMetrics(node);
  const cyclomatic = computeCyclomaticMetrics(node);
  const halstead = computeHalsteadMetrics(node);
  const composite = computeCompositeScore(structural, cyclomatic, halstead);

  return {
    componentName: node.name,
    nodeId: node.id,
    structural,
    cyclomatic,
    halstead,
    composite,
  };
}

/**
 * Analyse all components in the list and return results sorted by
 * composite score (highest complexity first).
 */
export function analyzeAllComponents(
  components: LintComponent[],
  onProgress?: (msg: string) => void,
): ComponentComplexityResult[] {
  const results: ComponentComplexityResult[] = [];

  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    if (onProgress) {
      onProgress(`Analyzing ${comp.node.name} (${i + 1}/${components.length})`);
    }
    results.push(analyzeComponentComplexity(comp));
  }

  return results.sort((a, b) => b.composite - a.composite);
}
