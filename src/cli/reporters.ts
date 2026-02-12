/**
 * Output reporters for the CLI.
 *
 * Each reporter takes the structured audit results and writes them in a
 * particular format (JSON file, HTML standalone report, console summary).
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AuditCheck } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface AuditResults {
  fileKey: string;
  fileName: string;
  timestamp: string;
  scores: {
    overall: ScoreStats;
    collection: ScoreStats;
    textStyle: ScoreStats;
    component: ComponentScoreStats;
  };
  collectionStructure: AuditCheck[];
  textStyleSync: AuditCheck[];
  componentBindings: AuditCheck[];
}

export interface ScoreStats {
  score: number;
  passed: number;
  warnings: number;
  failed: number;
  total: number;
}

export interface ComponentScoreStats {
  score: number;
  passed: number;
  failed: number;
  total: number;
}

// ============================================================================
// Console Reporter
// ============================================================================

function statusIcon(status: string): string {
  switch (status) {
    case 'pass': return '\u2705'; // green check
    case 'fail': return '\u274C'; // red cross
    case 'warning': return '\u26A0\uFE0F'; // warning
    default: return '\u2022';
  }
}

export function reportToConsole(results: AuditResults): void {
  const { scores } = results;

  console.log('\n' + '='.repeat(60));
  console.log(`  ctdsLint Audit Report — ${results.fileName}`);
  console.log(`  ${results.timestamp}`);
  console.log('='.repeat(60));

  // Overall score
  console.log(`\n  Overall score: ${scores.overall.score}%  (${scores.overall.passed} passed, ${scores.overall.failed} failed of ${scores.overall.total})`);

  // Collection section
  if (results.collectionStructure.length > 0) {
    console.log(`\n--- Collection Structure (${scores.collection.score}%) ---`);
    for (const check of results.collectionStructure) {
      console.log(`  ${statusIcon(check.status)} ${check.check}`);
    }
  }

  // Text style section
  if (results.textStyleSync.length > 0) {
    console.log(`\n--- Text Styles (${scores.textStyle.score}%) ---`);
    for (const check of results.textStyleSync) {
      console.log(`  ${statusIcon(check.status)} ${check.check}`);
    }
  }

  // Component section
  if (results.componentBindings.length > 0) {
    console.log(`\n--- Components (${scores.component.score}%) ---`);
    for (const check of results.componentBindings) {
      const page = (check as any).pageName ? ` [${(check as any).pageName}]` : '';
      console.log(`  ${statusIcon(check.status)} ${check.check}${page}`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================================================
// JSON Reporter
// ============================================================================

export function reportToJsonFile(results: AuditResults, outputPath: string): void {
  const absPath = resolve(outputPath);
  writeFileSync(absPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`JSON report written to: ${absPath}`);
}

// ============================================================================
// HTML Reporter
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function htmlStatusBadge(status: string): string {
  const colors: Record<string, string> = {
    pass: '#22c55e',
    fail: '#ef4444',
    warning: '#f59e0b',
  };
  const bg = colors[status] || '#6b7280';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${bg};color:#fff;font-size:12px;font-weight:600;">${status.toUpperCase()}</span>`;
}

function buildChecksHtml(checks: AuditCheck[]): string {
  if (checks.length === 0) return '<p style="color:#6b7280;">No checks in this section.</p>';
  return checks
    .map(c => {
      const page = (c as any).pageName ? ` <span style="color:#6b7280;font-size:12px;">[${escapeHtml((c as any).pageName)}]</span>` : '';
      return `<div style="margin:8px 0;padding:8px 12px;border-left:3px solid ${c.status === 'pass' ? '#22c55e' : c.status === 'fail' ? '#ef4444' : '#f59e0b'};background:#fafafa;border-radius:0 4px 4px 0;">
  <div>${htmlStatusBadge(c.status)} <strong>${escapeHtml(c.check)}</strong>${page}</div>
  <div style="margin-top:4px;font-size:13px;color:#374151;">${escapeHtml(c.suggestion)}</div>
</div>`;
    })
    .join('\n');
}

export function reportToHtmlFile(results: AuditResults, outputPath: string): void {
  const { scores } = results;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ctdsLint Report — ${escapeHtml(results.fileName)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; background: #f9fafb; padding: 32px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
  .score-card { display:flex; gap:16px; margin-bottom: 32px; flex-wrap: wrap; }
  .score-item { flex:1; min-width:160px; background:#fff; border-radius:8px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.1); text-align:center; }
  .score-number { font-size:36px; font-weight:700; }
  .score-label { font-size:13px; color:#6b7280; }
  .section { margin-bottom: 32px; }
  .section h2 { font-size: 18px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
</style>
</head>
<body>
<h1>ctdsLint Audit Report</h1>
<div class="meta">${escapeHtml(results.fileName)} &mdash; ${escapeHtml(results.timestamp)}</div>

<div class="score-card">
  <div class="score-item"><div class="score-number">${scores.overall.score}%</div><div class="score-label">Overall</div></div>
  <div class="score-item"><div class="score-number">${scores.collection.score}%</div><div class="score-label">Collections</div></div>
  <div class="score-item"><div class="score-number">${scores.textStyle.score}%</div><div class="score-label">Text Styles</div></div>
  <div class="score-item"><div class="score-number">${scores.component.score}%</div><div class="score-label">Components</div></div>
</div>

<div class="section">
  <h2>Collection Structure</h2>
  ${buildChecksHtml(results.collectionStructure)}
</div>

<div class="section">
  <h2>Text Styles</h2>
  ${buildChecksHtml(results.textStyleSync)}
</div>

<div class="section">
  <h2>Component Bindings</h2>
  ${buildChecksHtml(results.componentBindings)}
</div>

</body>
</html>`;

  const absPath = resolve(outputPath);
  writeFileSync(absPath, html, 'utf-8');
  console.log(`HTML report written to: ${absPath}`);
}

// ============================================================================
// Score Helpers (shared between CLI and reporters)
// ============================================================================

export function calculateAuditStats(checks: AuditCheck[]): ScoreStats {
  if (checks.length === 0) {
    return { score: 100, passed: 0, warnings: 0, failed: 0, total: 0 };
  }
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);
  return { score, passed, warnings: 0, failed, total };
}

export function calculateComponentStats(checks: AuditCheck[]): ComponentScoreStats {
  if (checks.length === 0) {
    return { score: 100, passed: 0, failed: 0, total: 0 };
  }
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);
  return { score, passed, failed, total };
}

// ============================================================================
// Complexity Reporters
// ============================================================================

import type { ComponentComplexityResult } from '../shared/types';

function compositeLabel(score: number): string {
  if (score <= 20) return 'Simple';
  if (score <= 40) return 'Moderate';
  if (score <= 60) return 'Complex';
  if (score <= 80) return 'Very Complex';
  return 'Extremely Complex';
}

function compositeBar(score: number, width: number = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

function pad(str: string, len: number): string {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

function printSingleResult(r: ComponentComplexityResult): void {
  const header = `Component Complexity: ${r.componentName} (${r.nodeId})`;
  console.log(header);
  console.log('\u2500'.repeat(header.length));
  if (r.figmaUrl) {
    console.log(`  ${r.figmaUrl}`);
  }

  // Structural
  console.log('Structural');
  console.log(`  ${pad('Node count', 16)} ${r.structural.nodeCount}`);
  console.log(`  ${pad('Max depth', 16)} ${r.structural.maxDepth}`);
  console.log(`  ${pad('Leaf nodes', 16)} ${r.structural.leafCount}`);
  console.log(`  ${pad('Max fan-out', 16)} ${r.structural.maxFanOut}`);

  const types = Object.keys(r.structural.typeDistribution).join(', ');
  console.log(`  ${pad('Unique types', 16)} ${r.structural.uniqueTypes}  (${types})`);

  // Cyclomatic
  const cb = r.cyclomatic.breakdown;
  const parts = ['1 base'];
  if (cb.variants > 0) parts.push(`${cb.variants} variants`);
  if (cb.booleanProps > 0) parts.push(`${cb.booleanProps} boolean`);
  if (cb.instanceSwaps > 0) parts.push(`${cb.instanceSwaps} swap`);
  if (cb.textProps > 0) parts.push(`${cb.textProps} text`);
  console.log(`\nCyclomatic        ${pad(String(r.cyclomatic.score), 4)} (${parts.join(' + ')})`);

  // Halstead
  console.log(`Halstead Volume   ${pad(String(r.halstead.volume), 4)} (n=${r.halstead.vocabulary}, N=${r.halstead.length})`);
  console.log(`Halstead Effort   ${r.halstead.effort}`);

  // Composite
  console.log(`\nComposite Score   ${r.composite}/100  ${compositeBar(r.composite)}  ${compositeLabel(r.composite)}`);
}

export function reportComplexityToConsole(
  results: ComponentComplexityResult[],
): void {
  if (results.length === 0) {
    console.log('No components to analyse.');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('  ctdsLint Component Complexity Report');
  console.log('='.repeat(60));

  if (results.length === 1) {
    console.log('');
    printSingleResult(results[0]);
    console.log('\n' + '='.repeat(60) + '\n');
    return;
  }

  // Summary table for multiple components
  console.log(`\n  ${results.length} components analysed (sorted by complexity)\n`);

  // Table header
  const nameW = 36;
  const colW = 8;
  console.log(
    `  ${pad('Component', nameW)} ${pad('CC', colW)}${pad('Halst', colW)}${pad('Depth', colW)}${pad('Nodes', colW)}${pad('Score', colW)}`,
  );
  console.log('  ' + '\u2500'.repeat(nameW + colW * 5));

  for (const r of results) {
    const name = r.componentName.length > nameW - 2
      ? r.componentName.slice(0, nameW - 5) + '...'
      : r.componentName;
    console.log(
      `  ${pad(name, nameW)} ${pad(String(r.cyclomatic.score), colW)}${pad(String(r.halstead.volume), colW)}${pad(String(r.structural.maxDepth), colW)}${pad(String(r.structural.nodeCount), colW)}${pad(r.composite + '/100', colW)}`,
    );
  }

  console.log('');

  // Print details for top 5 most complex
  const detailed = results.slice(0, 5);
  for (const r of detailed) {
    console.log('');
    printSingleResult(r);
  }

  if (results.length > 5) {
    console.log(`\n  ... and ${results.length - 5} more (use --format json for full details)`);
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

export function reportComplexityToJsonFile(
  results: ComponentComplexityResult[],
  outputPath: string,
): void {
  const absPath = resolve(outputPath);
  writeFileSync(absPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Complexity JSON report written to: ${absPath}`);
}

// ============================================================================
// Complexity HTML Reporter
// ============================================================================

function compositeColor(score: number): string {
  if (score <= 20) return '#22c55e';
  if (score <= 40) return '#84cc16';
  if (score <= 60) return '#f59e0b';
  if (score <= 80) return '#ef4444';
  return '#dc2626';
}

function buildComponentCard(r: ComponentComplexityResult): string {
  const color = compositeColor(r.composite);
  const label = compositeLabel(r.composite);
  const pct = r.composite;

  const cb = r.cyclomatic.breakdown;
  const ccParts = ['1 base'];
  if (cb.variants > 0) ccParts.push(`${cb.variants} variants`);
  if (cb.booleanProps > 0) ccParts.push(`${cb.booleanProps} boolean`);
  if (cb.instanceSwaps > 0) ccParts.push(`${cb.instanceSwaps} swap`);
  if (cb.textProps > 0) ccParts.push(`${cb.textProps} text`);

  const types = Object.entries(r.structural.typeDistribution)
    .map(([t, n]) => `<span class="type-tag">${escapeHtml(t)} <strong>${n}</strong></span>`)
    .join(' ');

  const nameHtml = r.figmaUrl
    ? `<a href="${escapeHtml(r.figmaUrl)}" target="_blank" rel="noopener">${escapeHtml(r.componentName)}</a>`
    : escapeHtml(r.componentName);

  return `<div class="card">
  <div class="card-header">
    <div>
      <h3>${nameHtml}</h3>
      <span class="node-id">${escapeHtml(r.nodeId)}</span>
    </div>
    <div class="score-badge" style="background:${color};">${pct}<small>/100</small></div>
  </div>
  <div class="score-label" style="color:${color};">${label}</div>
  <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${color};"></div></div>

  <div class="metrics-grid">
    <div class="metric-section">
      <h4>Structural</h4>
      <table class="metric-table">
        <tr><td>Node count</td><td>${r.structural.nodeCount}</td></tr>
        <tr><td>Max depth</td><td>${r.structural.maxDepth}</td></tr>
        <tr><td>Leaf nodes</td><td>${r.structural.leafCount}</td></tr>
        <tr><td>Max fan-out</td><td>${r.structural.maxFanOut}</td></tr>
        <tr><td>Unique types</td><td>${r.structural.uniqueTypes}</td></tr>
      </table>
      <div class="type-tags">${types}</div>
    </div>
    <div class="metric-section">
      <h4>Cyclomatic</h4>
      <div class="big-number">${r.cyclomatic.score}</div>
      <div class="metric-detail">${ccParts.join(' + ')}</div>
    </div>
    <div class="metric-section">
      <h4>Halstead</h4>
      <table class="metric-table">
        <tr><td>Vocabulary (n)</td><td>${r.halstead.vocabulary}</td></tr>
        <tr><td>Length (N)</td><td>${r.halstead.length}</td></tr>
        <tr><td>Volume</td><td>${r.halstead.volume}</td></tr>
        <tr><td>Difficulty</td><td>${r.halstead.difficulty}</td></tr>
        <tr><td>Effort</td><td>${r.halstead.effort}</td></tr>
      </table>
    </div>
  </div>
</div>`;
}

export function reportComplexityToHtmlFile(
  results: ComponentComplexityResult[],
  outputPath: string,
): void {
  const cards = results.map(buildComponentCard).join('\n');

  const summaryRows = results.map(r => {
    const color = compositeColor(r.composite);
    const nameCell = r.figmaUrl
      ? `<a href="${escapeHtml(r.figmaUrl)}" target="_blank" rel="noopener">${escapeHtml(r.componentName)}</a>`
      : escapeHtml(r.componentName);
    return `<tr>
      <td>${nameCell}</td>
      <td>${r.cyclomatic.score}</td>
      <td>${r.halstead.volume}</td>
      <td>${r.structural.maxDepth}</td>
      <td>${r.structural.nodeCount}</td>
      <td style="color:${color};font-weight:700;">${r.composite}/100</td>
    </tr>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ctdsLint Complexity Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937; background:#f9fafb; padding:32px; max-width:1100px; margin:0 auto; }
  h1 { font-size:24px; margin-bottom:4px; }
  h3 { font-size:16px; margin:0; }
  h4 { font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; margin-bottom:8px; }
  .meta { color:#6b7280; font-size:14px; margin-bottom:24px; }
  .summary-table { width:100%; border-collapse:collapse; margin-bottom:32px; font-size:14px; }
  .summary-table th { text-align:left; padding:8px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; }
  .summary-table td { padding:8px 12px; border-bottom:1px solid #f3f4f6; }
  .summary-table tr:hover { background:#f9fafb; }
  .card { background:#fff; border-radius:12px; padding:24px; box-shadow:0 1px 3px rgba(0,0,0,.1); margin-bottom:20px; }
  .card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; }
  .node-id { font-size:12px; color:#9ca3af; font-family:monospace; }
  .score-badge { color:#fff; font-size:28px; font-weight:700; border-radius:8px; padding:6px 14px; line-height:1; }
  .score-badge small { font-size:14px; font-weight:400; opacity:.8; }
  .score-label { font-size:13px; font-weight:600; margin-bottom:8px; }
  .progress-bar { height:6px; background:#e5e7eb; border-radius:3px; overflow:hidden; margin-bottom:20px; }
  .progress-fill { height:100%; border-radius:3px; transition:width .3s; }
  .metrics-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; }
  .metric-table { width:100%; font-size:13px; }
  .metric-table td { padding:3px 0; }
  .metric-table td:last-child { text-align:right; font-weight:600; font-variant-numeric:tabular-nums; }
  .metric-detail { font-size:12px; color:#6b7280; margin-top:4px; }
  .big-number { font-size:36px; font-weight:700; line-height:1; }
  .type-tags { margin-top:8px; display:flex; flex-wrap:wrap; gap:4px; }
  .type-tag { font-size:11px; background:#f3f4f6; border-radius:4px; padding:2px 6px; color:#4b5563; }
  a { color:#2563eb; text-decoration:none; }
  a:hover { text-decoration:underline; }
  .rubric { background:#fff; border-radius:12px; padding:24px; box-shadow:0 1px 3px rgba(0,0,0,.1); margin-bottom:28px; }
  .rubric h2 { font-size:16px; margin-bottom:12px; }
  .rubric p { font-size:13px; color:#4b5563; line-height:1.6; margin-bottom:10px; }
  .rubric-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:16px; }
  .rubric-item h4 { margin-bottom:4px; }
  .rubric-item p { font-size:12px; margin:0; }
  .scale-row { display:flex; gap:6px; margin-top:12px; }
  .scale-chip { flex:1; text-align:center; padding:6px 0; border-radius:6px; font-size:12px; font-weight:600; color:#fff; }
  details { font-size:13px; color:#4b5563; margin-top:8px; }
  details summary { cursor:pointer; font-weight:600; color:#1f2937; padding:4px 0; }
  details p { margin-top:6px; }
  @media (max-width:700px) { .metrics-grid { grid-template-columns:1fr; } .rubric-grid { grid-template-columns:1fr; } }
</style>
</head>
<body>
<h1>ctdsLint Complexity Report</h1>
<div class="meta">${results.length} component${results.length === 1 ? '' : 's'} analysed &mdash; sorted by composite score</div>

<div class="rubric">
  <h2>Scoring Rubric</h2>
  <p>Each component is scored on three dimensions adapted from established code complexity metrics, then combined into a single <strong>Composite Score</strong> (0&ndash;100).</p>

  <div class="rubric-grid">
    <div class="rubric-item">
      <h4>Structural</h4>
      <p>Shape of the layer tree: total nodes, nesting depth, leaf count, max fan-out, and type variety. More layers and deeper nesting mean more to understand.</p>
    </div>
    <div class="rubric-item">
      <h4>Cyclomatic (CC)</h4>
      <p>Number of &ldquo;decision paths&rdquo; a consumer faces: variant options, boolean toggles, instance-swap slots, and text overrides. Higher CC = more states to design, build, and test.</p>
    </div>
    <div class="rubric-item">
      <h4>Halstead</h4>
      <p>Vocabulary and volume of the component&rsquo;s design decisions. <em>Operators</em> are structural constructs (layer types, layout modes, effects, blend modes). <em>Operands</em> are values (colours, sizes, spacing, radii). Volume = N &times; log<sub>2</sub>(n).</p>
    </div>
  </div>

  <details>
    <summary>Composite formula</summary>
    <p>30% structural (log-scaled node count + depth) + 30% cyclomatic + 40% Halstead volume (log-scaled). Each dimension is clamped to 0&ndash;100 before weighting so no single axis dominates.</p>
  </details>

  <div class="scale-row">
    <div class="scale-chip" style="background:#22c55e;">0&ndash;20 Simple</div>
    <div class="scale-chip" style="background:#84cc16;">21&ndash;40 Moderate</div>
    <div class="scale-chip" style="background:#f59e0b;">41&ndash;60 Complex</div>
    <div class="scale-chip" style="background:#ef4444;">61&ndash;80 Very Complex</div>
    <div class="scale-chip" style="background:#dc2626;">81&ndash;100 Extremely Complex</div>
  </div>
</div>

${results.length > 1 ? `<table class="summary-table">
  <thead><tr><th>Component</th><th>CC</th><th>Halstead Vol.</th><th>Depth</th><th>Nodes</th><th>Score</th></tr></thead>
  <tbody>${summaryRows}</tbody>
</table>` : ''}

${cards}
</body>
</html>`;

  const absPath = resolve(outputPath);
  writeFileSync(absPath, html, 'utf-8');
  console.log(`Complexity HTML report written to: ${absPath}`);
}
