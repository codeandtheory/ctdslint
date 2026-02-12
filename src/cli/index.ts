#!/usr/bin/env node

/**
 * ctdsLint CLI
 *
 * Runs the CT/DS design system audit against a Figma file via the REST API
 * and writes results to the console, a JSON file, or an HTML report.
 *
 * Usage:
 *   node dist-cli/cli/index.js --file-key <key> [options]
 *   node dist-cli/cli/index.js --url <figma-url> --audit-type complexity
 *
 * Options:
 *   --file-key, -f    Figma file key (required unless --url is used)
 *   --url, -u         Figma URL (extracts file key and optional node ID)
 *   --node-id, -n     Target node ID (when using --file-key for complexity)
 *   --token, -t       Figma Personal Access Token (or set FIGMA_PERSONAL_ACCESS_TOKEN env var)
 *   --output, -o      Output file path (e.g. report.json or report.html)
 *   --format          Output format: json | html | console (default: console)
 *   --audit-type      Audit scope: system | variables-styles | components | complexity
 *   --help, -h        Show this help text
 */

import { FigmaApiClient } from './figma-api';
import { buildLintData, findComponents, adaptNodeStandalone } from './data-adapter';
import {
  validateCollectionStructure,
  validateTextStylesAgainstVariables,
  validateTextStyleBindings,
  validateAllComponentBindings,
} from '../core/collection-validator';
import { analyzeAllComponents, analyzeComponentComplexity } from '../core/complexity-analyzer';
import { parseFigmaUrl } from './url-parser';
import {
  AuditResults,
  calculateAuditStats,
  calculateComponentStats,
  reportToConsole,
  reportToJsonFile,
  reportToHtmlFile,
  reportComplexityToConsole,
  reportComplexityToJsonFile,
  reportComplexityToHtmlFile,
} from './reporters';

// ============================================================================
// Argument parsing (zero dependencies)
// ============================================================================

interface CliArgs {
  fileKey: string;
  url: string;
  nodeId: string;
  token: string;
  output?: string;
  format: 'json' | 'html' | 'console';
  auditType: 'system' | 'variables-styles' | 'components' | 'complexity';
  help: boolean;
}

function printHelp(): void {
  console.log(`
ctdsLint CLI — CT/DS Design System Auditor

Usage:
  node dist-cli/cli/index.js [options]

Options:
  --file-key, -f    Figma file key (or set FIGMA_FILE_KEY env var)
  --url, -u         Figma URL (extracts file key and optional node ID)
  --node-id, -n     Target node ID for complexity analysis
  --token, -t       Figma Personal Access Token (or set FIGMA_PERSONAL_ACCESS_TOKEN env var)
  --output, -o      Output file path (e.g. report.json or report.html)
  --format          Output format: json | html | console (default: console)
  --audit-type      Audit scope: system | variables-styles | components | complexity
                    (default: system)
  --help, -h        Show this help text

Environment Variables:
  FIGMA_FILE_KEY    Figma file key (used when --file-key is not provided)
  FIGMA_PERSONAL_ACCESS_TOKEN       Figma Personal Access Token (used when --token is not provided)

Examples:
  # Using env vars (recommended)
  export FIGMA_FILE_KEY=abc123DEF
  export FIGMA_PERSONAL_ACCESS_TOKEN=figd_xxx
  node dist-cli/cli/index.js

  # Using flags
  node dist-cli/cli/index.js -f abc123DEF -t figd_xxx

  # Output to file
  node dist-cli/cli/index.js --format json -o report.json
  node dist-cli/cli/index.js --format html -o report.html --audit-type components

  # Component complexity analysis from a Figma URL
  node dist-cli/cli/index.js --url "https://www.figma.com/design/abc123/MyLib?node-id=42-100" --audit-type complexity

  # Complexity analysis for all components in a file
  node dist-cli/cli/index.js -f abc123DEF --audit-type complexity

  # Complexity output as JSON
  node dist-cli/cli/index.js --url "https://..." --audit-type complexity --format json -o complexity.json
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    fileKey: process.env.FIGMA_FILE_KEY ?? '',
    url: '',
    nodeId: '',
    token: process.env.FIGMA_PERSONAL_ACCESS_TOKEN ?? '',
    output: undefined,
    format: 'console',
    auditType: 'system',
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--file-key':
      case '-f':
        args.fileKey = next ?? '';
        i++;
        break;
      case '--url':
      case '-u':
        args.url = next ?? '';
        i++;
        break;
      case '--node-id':
      case '-n':
        args.nodeId = next ?? '';
        i++;
        break;
      case '--token':
      case '-t':
        args.token = next ?? '';
        i++;
        break;
      case '--output':
      case '-o':
        args.output = next ?? '';
        i++;
        break;
      case '--format':
        args.format = (next ?? 'console') as CliArgs['format'];
        i++;
        break;
      case '--audit-type':
        args.auditType = (next ?? 'system') as CliArgs['auditType'];
        i++;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        if (!arg.startsWith('-') && !args.fileKey) {
          // Treat first positional argument as file key
          args.fileKey = arg;
        }
        break;
    }
  }

  // If --url was provided, extract file key and optional node ID from it
  if (args.url) {
    const parts = parseFigmaUrl(args.url);
    if (!args.fileKey) args.fileKey = parts.fileKey;
    if (!args.nodeId && parts.nodeId) args.nodeId = parts.nodeId;
  }

  // Infer format from output extension if not explicitly set
  if (args.output && args.format === 'console') {
    if (args.output.endsWith('.json')) args.format = 'json';
    else if (args.output.endsWith('.html') || args.output.endsWith('.htm')) args.format = 'html';
  }

  return args;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.fileKey) {
    console.error('Error: Figma file key is required. Pass --file-key, --url, or set FIGMA_FILE_KEY.');
    process.exit(1);
  }

  if (!args.token) {
    console.error('Error: Figma token is required. Pass --token or set FIGMA_PERSONAL_ACCESS_TOKEN.');
    process.exit(1);
  }

  const client = new FigmaApiClient({ token: args.token });

  // ==================================================================
  // Complexity audit — a separate path that doesn't need variables
  // ==================================================================
  if (args.auditType === 'complexity') {
    await runComplexityAudit(client, args);
    return;
  }

  // ==================================================================
  // Standard audit (system / variables-styles / components)
  // ==================================================================

  // ---- Fetch data from Figma ----
  console.log(`Fetching Figma file ${args.fileKey}...`);

  const fileResponse = await client.getFile(args.fileKey);
  console.log(`File: "${fileResponse.name}"`);

  // Attempt to fetch variables (Enterprise-only)
  let variablesResponse;
  try {
    console.log('Fetching variables (requires Enterprise plan)...');
    variablesResponse = await client.getLocalVariables(args.fileKey);
    const numCollections = Object.keys(variablesResponse.meta.variableCollections).length;
    const numVars = Object.keys(variablesResponse.meta.variables).length;
    console.log(`Found ${numCollections} collections, ${numVars} variables.`);
  } catch (err) {
    console.warn(
      'Could not fetch variables (requires Enterprise plan). ' +
      'Collection and variable validation will be skipped.'
    );
    variablesResponse = undefined;
  }

  // ---- Adapt to shared types ----
  const data = buildLintData(fileResponse, variablesResponse);
  const components = findComponents(data.pages);
  console.log(`Discovered ${components.length} components across ${data.pages.length} pages.`);

  // ---- Run validators ----
  console.log(`Running ${args.auditType} audit...\n`);

  let collectionChecks: any[] = [];
  let textStyleChecks: any[] = [];
  let componentChecks: any[] = [];

  if (args.auditType === 'system' || args.auditType === 'variables-styles') {
    const collectionValidation = validateCollectionStructure(data.collections, data.variables);
    collectionChecks = collectionValidation.auditChecks;

    const textStyleSync = validateTextStylesAgainstVariables(
      data.collections, data.variables, data.textStyles
    );
    const textStyleBindings = validateTextStyleBindings(data.textStyles, data.variables);
    textStyleChecks = [...textStyleSync.auditChecks, ...textStyleBindings.auditChecks];
  }

  if (args.auditType === 'system' || args.auditType === 'components') {
    const componentBindings = validateAllComponentBindings(components, (msg) => {
      process.stdout.write(`\r  ${msg}`);
    });
    componentChecks = componentBindings.auditChecks;
    process.stdout.write('\r' + ' '.repeat(80) + '\r'); // clear progress line
  }

  // ---- Build results ----
  const allChecks = [...collectionChecks, ...textStyleChecks, ...componentChecks];
  const results: AuditResults = {
    fileKey: args.fileKey,
    fileName: fileResponse.name,
    timestamp: new Date().toISOString(),
    scores: {
      overall: calculateAuditStats(allChecks),
      collection: calculateAuditStats(collectionChecks),
      textStyle: calculateAuditStats(textStyleChecks),
      component: calculateComponentStats(componentChecks),
    },
    collectionStructure: collectionChecks,
    textStyleSync: textStyleChecks,
    componentBindings: componentChecks,
  };

  // ---- Output ----
  switch (args.format) {
    case 'json':
      if (args.output) {
        reportToJsonFile(results, args.output);
      } else {
        console.log(JSON.stringify(results, null, 2));
      }
      break;
    case 'html':
      if (args.output) {
        reportToHtmlFile(results, args.output);
      } else {
        console.error('HTML format requires --output path. Example: --output report.html');
        process.exit(1);
      }
      break;
    case 'console':
    default:
      reportToConsole(results);
      if (args.output) {
        // Also write JSON if an output file was specified alongside console output
        reportToJsonFile(results, args.output);
      }
      break;
  }

  // Exit with non-zero if any checks failed
  if (results.scores.overall.failed > 0) {
    process.exit(2);
  }
}

// ============================================================================
// Complexity Audit
// ============================================================================

/** Build a Figma deep-link URL from a file key and node ID. */
function buildFigmaUrl(fileKey: string, nodeId: string): string {
  const hyphenated = nodeId.replace(/:/g, '-');
  return `https://www.figma.com/design/${fileKey}?node-id=${hyphenated}`;
}

async function runComplexityAudit(
  client: FigmaApiClient,
  args: CliArgs,
): Promise<void> {
  const { fileKey, nodeId } = args;

  if (nodeId) {
    // ---- Targeted: analyse a specific node ----
    console.log(`Fetching node ${nodeId} from file ${fileKey}...`);
    const nodesResponse = await client.getNodes(fileKey, [nodeId]);
    const entry = nodesResponse.nodes[nodeId];
    if (!entry || !entry.document) {
      console.error(`Node ${nodeId} not found in file ${fileKey}.`);
      process.exit(1);
    }

    const lintNode = adaptNodeStandalone(entry.document);
    const component = { node: lintNode, pageName: '' };
    const result = analyzeComponentComplexity(component);
    result.figmaUrl = buildFigmaUrl(fileKey, result.nodeId);

    outputComplexity([result], args);
  } else {
    // ---- Whole-file: analyse all components ----
    console.log(`Fetching Figma file ${fileKey}...`);
    const fileResponse = await client.getFile(fileKey);
    console.log(`File: "${fileResponse.name}"`);

    const data = buildLintData(fileResponse);
    const components = findComponents(data.pages);

    if (components.length === 0) {
      console.log('No components found in this file.');
      return;
    }

    console.log(`Analysing ${components.length} components...\n`);
    const results = analyzeAllComponents(components, (msg) => {
      process.stdout.write(`\r  ${msg}`);
    });
    process.stdout.write('\r' + ' '.repeat(80) + '\r');

    for (const r of results) {
      r.figmaUrl = buildFigmaUrl(fileKey, r.nodeId);
    }

    outputComplexity(results, args);
  }
}

function outputComplexity(
  results: import('../shared/types').ComponentComplexityResult[],
  args: CliArgs,
): void {
  switch (args.format) {
    case 'json':
      if (args.output) {
        reportComplexityToJsonFile(results, args.output);
      } else {
        console.log(JSON.stringify(results, null, 2));
      }
      break;
    case 'html':
      if (args.output) {
        reportComplexityToHtmlFile(results, args.output);
      } else {
        console.error('HTML format requires --output path. Example: --output report.html');
        process.exit(1);
      }
      break;
    case 'console':
    default:
      reportComplexityToConsole(results);
      if (args.output) {
        reportComplexityToJsonFile(results, args.output);
      }
      break;
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
