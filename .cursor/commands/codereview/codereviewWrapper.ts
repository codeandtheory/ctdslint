#!/usr/bin/env tsx
/**
 * Wrapper script for the /codereview Cursor slash command.
 * This script handles the execution of the comprehensive code analysis.
 * 
 * The actual analysis code lives in tools/codereview/
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Command } from 'commander';

// Get the project root (go up from .cursor/commands/codereview)
function getProjectRoot(): string {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  let currentDir = scriptDir;
  while (true) {
    if (fs.existsSync(path.join(currentDir, '.git'))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Fallback: go up 3 levels from .cursor/commands/codereview
      return path.resolve(scriptDir, '..', '..', '..');
    }
    currentDir = parentDir;
  }
}

function generateMarkdownSummary(outputDir: string, rootDir: string): string {
  const summaryFile = path.join(outputDir, 'summary', 'analysis_summary.json');
  
  if (!fs.existsSync(summaryFile)) {
    return '❌ Analysis summary file not found';
  }

  try {
    const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
    const metadata = summary.analysis_metadata || {};
    const overall = summary.overall_summary || {};
    const projectScore = summary.quantitative_project_score || {};
    const areaBreakdown = summary.area_breakdown || {};

    const severityTotals = overall.severity_totals || {};
    const criticalCount = severityTotals.CRITICAL || 0;
    const highCount = severityTotals.HIGH || 0;
    const mediumCount = severityTotals.MEDIUM || 0;
    const lowCount = severityTotals.LOW || 0;

    const priorityAreas = projectScore.improvement_priority_areas || [];
    const totalViolations = overall.total_violations || 0;
    const filesWithViolations = overall.files_with_violations || 0;
    const healthGrade = projectScore.project_health_grade || 'N/A';
    const weightedScore = projectScore.weighted_project_score || 0;

    const mdContent = `# 🎯 Comprehensive Code Quality Analysis Report

**Analysis Date:** ${metadata.analysis_date || 'Unknown'}  
**Directory Analyzed:** \`${rootDir}\`  
**Files Analyzed:** ${metadata.total_files_analyzed || 0}  
**Project Health Grade:** **${healthGrade}** (Score: ${weightedScore.toFixed(1)})

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Violations** | ${totalViolations} |
| **Files with Violations** | ${filesWithViolations} |
| **Critical Issues** | ${criticalCount} |
| **High Priority** | ${highCount} |
| **Medium Priority** | ${mediumCount} |
| **Low Priority** | ${lowCount} |

## 🚨 Severity Breakdown

| Severity | Count | Action Required |
|----------|-------|-----------------|
| 🔴 Critical | ${criticalCount} | Immediate attention required |
| 🟠 High | ${highCount} | High priority fixes |
| 🟡 Medium | ${mediumCount} | Address in next sprint |
| 🔵 Low | ${lowCount} | Technical debt backlog |

## 📈 Top Priority Areas

${priorityAreas.slice(0, 3).map((area: string, i: number) => 
  `${i + 1}. **${area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}**`
).join('\n')}

## 📋 Detailed Area Breakdown

| Area | Violations | Files Affected |
|------|------------|----------------|
${Object.entries(areaBreakdown)
  .sort((a, b) => (b[1] as any).violations - (a[1] as any).violations)
  .map(([area, data]: [string, any]) => {
    const areaName = area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `| ${areaName} | ${data.violations} | ${data.files} |`;
  })
  .join('\n')}

---

*Generated on ${new Date().toISOString().split('T')[0]}*  
*For detailed analysis, see the JSON files in the output directory*
`;

    return mdContent;
  } catch (e: any) {
    return `❌ Error reading summary file: ${e.message}`;
  }
}

function runAnalyzerCommand(cmd: string[], projectRoot: string): boolean {
  try {
    execSync(cmd.join(' '), {
      cwd: projectRoot,
      stdio: 'inherit',
      encoding: 'utf-8',
    });
    return true;
  } catch (e: any) {
    console.error('❌ Analysis failed');
    console.error(`Error: ${e.message}`);
    return false;
  }
}

function writeMarkdownSummaryFile(outputDir: string, rootDir: string, outputFolderName: string): boolean {
  try {
    const markdownContent = generateMarkdownSummary(outputDir, rootDir);
    const summaryPath = path.join(outputDir, 'ANALYSIS_SUMMARY.md');
    fs.writeFileSync(summaryPath, markdownContent, 'utf-8');
    console.log(`✅ Markdown summary saved to: ${summaryPath}`);
    return true;
  } catch (e: any) {
    console.error(`⚠️  Warning: Could not generate markdown summary: ${e.message}`);
    console.log(`📂 Raw analysis results available in: ${outputFolderName}/`);
    return false;
  }
}

function printKeyFindings(outputDir: string, outputFolderName: string) {
  const summaryFilePath = path.join(outputDir, 'summary', 'analysis_summary.json');
  if (!fs.existsSync(summaryFilePath)) {
    console.log(`📂 Raw analysis results available in: ${outputFolderName}/`);
    return;
  }

  let summary: any;
  try {
    summary = JSON.parse(fs.readFileSync(summaryFilePath, 'utf-8'));
  } catch (e: any) {
    console.error(`⚠️  Warning: Could not parse analysis summary: ${e.message}`);
    console.log(`📂 Raw analysis results available in: ${outputFolderName}/`);
    return;
  }

  const overall = summary.overall_summary || {};
  const projectScore = summary.quantitative_project_score || {};

  console.log();
  console.log('🎯 KEY FINDINGS:');
  console.log('='.repeat(50));
  console.log(`📊 Project Health Grade: ${projectScore.project_health_grade || 'N/A'}`);
  console.log(`🔍 Total Violations: ${overall.total_violations || 0}`);
  console.log(`📁 Files with Issues: ${overall.files_with_violations || 0}`);
  console.log(`⚡ Performance Score: ${(projectScore.overall_performance_score || 0).toFixed(1)}/5.0`);
  console.log(`🔒 Security Score: ${(projectScore.overall_security_score || 0).toFixed(1)}/5.0`);
  console.log(`🔧 Maintainability Score: ${(projectScore.overall_maintainability_score || 0).toFixed(1)}/5.0`);

  const priorityAreas = projectScore.improvement_priority_areas || [];
  if (priorityAreas.length > 0) {
    console.log();
    console.log('🎯 Top Priority Areas:');
    priorityAreas.slice(0, 3).forEach((area: string, i: number) => {
      console.log(`   ${i + 1}. ${area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
    });
  }

  console.log();
  console.log(`📂 Complete analysis available in: ${outputFolderName}/`);
  console.log(`📝 Detailed summary: ${outputFolderName}/ANALYSIS_SUMMARY.md`);
}

function handleSuccessfulAnalysis(outputDir: string, rootDir: string, outputFolderName: string) {
  console.log();
  console.log('✅ Analysis completed successfully!');
  console.log(`📂 Results saved to: ${outputFolderName}/`);
  console.log('📝 Generating markdown summary...');

  if (!writeMarkdownSummaryFile(outputDir, rootDir, outputFolderName)) {
    return;
  }

  printKeyFindings(outputDir, outputFolderName);
}

function getGitChangedFiles(projectRoot: string, staged: boolean = false): Set<string> | null {
  try {
    const cmd = staged
      ? ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR']
      : ['git', 'diff', 'HEAD', '--name-only', '--diff-filter=ACMR'];
    
    const result = execSync(cmd.join(' '), {
      cwd: projectRoot,
      encoding: 'utf-8',
    });
    
    const files = new Set(
      result
        .trim()
        .split('\n')
        .filter(line => line.trim())
    );
    
    return files.size > 0 ? files : null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return null;
  }
}

function main() {
  const program = new Command();
  program
    .name('codereviewWrapper')
    .description('Comprehensive React/Next.js Code Analysis')
    .argument('[root_dir]', 'Root directory to analyze', 'src')
    .option('--root <dir>', 'Alternative way to specify root directory')
    .option('--all', 'Analyze all files (default: only changed files)')
    .option('--changed', 'Only analyze files changed since last commit (this is the default behavior)')
    .option('--staged', 'Only analyze staged files');

  program.parse();
  const opts = program.opts();
  const rootDir = opts.root || program.args[0] || 'src';

  const projectRoot = getProjectRoot();
  
  // Path to analysis scripts in tools/codereview
  const toolsDir = path.join(projectRoot, 'tools', 'codereview');
  const analyzerScript = path.join(toolsDir, 'runFullAnalysis.ts');
  const standardsFile = path.join(toolsDir, 'comprehensive-coding-standards.json');

  if (!fs.existsSync(analyzerScript)) {
    console.error(`❌ Error: Analyzer script not found at ${analyzerScript}`);
    process.exit(1);
  }

  if (!fs.existsSync(standardsFile)) {
    console.error(`❌ Error: Standards file not found at ${standardsFile}`);
    process.exit(1);
  }

  const targetDir = path.join(projectRoot, rootDir);
  
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Error: Target directory '${rootDir}' does not exist in ${projectRoot}`);
    console.error(`   Full path: ${targetDir}`);
    process.exit(1);
  }

  // Create output directory structure
  const outputFolderName = `analysis-${rootDir.replace(/\//g, '-')}`;
  const outputDir = path.join(projectRoot, outputFolderName);

  for (const subdir of ['violations', 'metrics', 'comprehensive', 'diagrams', 'summary']) {
    const dir = path.join(outputDir, subdir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Determine git filtering mode
  let filterMode: string | null = null;

  if (opts.all) {
    // Analyze all files; filterMode stays null
  } else if (opts.staged) {
    const gitFiles = getGitChangedFiles(projectRoot, true);
    filterMode = 'staged';
    if (!gitFiles || gitFiles.size === 0) {
      console.error('❌ No staged files found. Exiting.');
      process.exit(1);
    }
  } else {
    // Default: changed files
    const gitFiles = getGitChangedFiles(projectRoot, false);
    filterMode = 'changed';
    if (!gitFiles || gitFiles.size === 0) {
      console.error('❌ No changed files found. Exiting.');
      console.error('💡 Tip: Make changes to files or use --all to analyze all files');
      process.exit(1);
    }
  }

  console.log('🎯 Starting comprehensive code analysis...');
  console.log(`📁 Project root: ${projectRoot}`);
  console.log(`🔍 Analyzing directory: ${rootDir}`);
  if (filterMode) {
    console.log(`🔍 Filter mode: ${filterMode} files only`);
  } else {
    console.log('🔍 Filter mode: all files');
  }
  console.log(`📊 Output will be saved to: ${outputFolderName}/`);
  console.log('📁 Created folder structure with 5 subdirectories');
  console.log();

  // Build command
  const cmd = [
    'npx',
    'tsx',
    analyzerScript,
    '--standards', standardsFile,
    '--src-dirs', rootDir,
    '--output-dir', outputDir,
  ];

  if (filterMode === 'changed') {
    cmd.push('--git-changed');
  } else if (filterMode === 'staged') {
    cmd.push('--git-staged');
  }

  const isSuccess = runAnalyzerCommand(cmd, projectRoot);
  if (!isSuccess) {
    process.exit(1);
  }

  handleSuccessfulAnalysis(outputDir, rootDir, outputFolderName);
  process.exit(0);
}

main();
