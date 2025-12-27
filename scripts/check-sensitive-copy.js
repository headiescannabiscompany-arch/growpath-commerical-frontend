#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { VISITOR_KEYS } from "@babel/types";

const traverse = traverseModule.default ?? traverseModule;

const KEYWORDS = ["cannabis", "cannibis", "marijuana"];
const GATE_IDENTIFIERS = new Set(["isGuildMember"]);
const ALLOWED_EXTENSIONS = new Set([".js", ".jsx"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const cliTargets = process.argv.slice(2);
const defaultSearchRoots = [
  path.join(projectRoot, "src"),
  path.join(projectRoot, "frontend", "src")
];

const violations = [];

function containsKeyword(value) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return KEYWORDS.some((kw) => lower.includes(kw));
}

function expressionContainsGate(node, seen = new Set()) {
  if (!node || typeof node.type !== "string" || seen.has(node)) {
    return false;
  }

  seen.add(node);

  if (node.type === "Identifier") {
    return GATE_IDENTIFIERS.has(node.name);
  }

  if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    if (expressionContainsGate(node.object, seen)) return true;
    if (node.computed && expressionContainsGate(node.property, seen)) return true;
    return false;
  }

  const keys = VISITOR_KEYS[node.type] || [];
  for (const key of keys) {
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (expressionContainsGate(child, seen)) return true;
      }
    } else if (value && expressionContainsGate(value, seen)) {
      return true;
    }
  }

  return false;
}

function pathIsInSubpath(targetPath, candidatePath) {
  if (!candidatePath) return false;
  let current = targetPath;
  while (current) {
    if (current === candidatePath) return true;
    current = current.parentPath;
  }
  return false;
}

function pathHasGuildGate(path) {
  const target = path;
  let current = path;

  while (current && current.parentPath) {
    const parent = current.parentPath;

    if (parent.isConditionalExpression()) {
      const consequent = parent.get("consequent");
      if (pathIsInSubpath(target, consequent) && expressionContainsGate(parent.node.test)) {
        return true;
      }
    }

    if (parent.isIfStatement()) {
      const consequent = parent.get("consequent");
      if (pathIsInSubpath(target, consequent) && expressionContainsGate(parent.node.test)) {
        return true;
      }
    }

    if (parent.isLogicalExpression() && parent.node.operator === "&&") {
      const right = parent.get("right");
      if (pathIsInSubpath(target, right) && expressionContainsGate(parent.node.left)) {
        return true;
      }
    }

    current = parent;
  }

  return false;
}

function recordViolation(file, loc, value) {
  violations.push({
    file,
    line: loc?.start?.line ?? "?",
    column: loc?.start?.column ?? "?",
    value: value.trim()
  });
}

function checkCandidate({ value, path, file, loc }) {
  if (!containsKeyword(value)) return;
  if (pathHasGuildGate(path)) return;
  recordViolation(file, loc ?? path.node.loc, value);
}

async function collectSourceFiles(targetPath, out = []) {
  if (!targetPath) return out;

  let stat;
  try {
    stat = await fs.stat(targetPath);
  } catch {
    return out;
  }

  if (stat.isFile()) {
    const ext = path.extname(targetPath);
    if (ALLOWED_EXTENSIONS.has(ext)) {
      out.push(targetPath);
    }
    return out;
  }

  if (!stat.isDirectory()) {
    return out;
  }

  let entries;
  try {
    entries = await fs.readdir(targetPath, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await collectSourceFiles(fullPath, out);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ALLOWED_EXTENSIONS.has(ext)) {
        out.push(fullPath);
      }
    }
  }

  return out;
}

async function analyzeFile(file) {
  let code;
  try {
    code = await fs.readFile(file, "utf8");
  } catch (err) {
    console.error(`Failed to read ${file}: ${err.message}`);
    return;
  }

  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: [
        "jsx",
        "classProperties",
        "optionalChaining",
        "nullishCoalescingOperator",
        "objectRestSpread",
        "topLevelAwait"
      ]
    });
  } catch (err) {
    console.error(`Failed to parse ${path.relative(projectRoot, file)}: ${err.message}`);
    return;
  }

  traverse(ast, {
    StringLiteral(literalPath) {
      checkCandidate({
        value: literalPath.node.value,
        path: literalPath,
        file
      });
    },
    TemplateLiteral(templatePath) {
      for (const quasi of templatePath.node.quasis) {
        checkCandidate({
          value: quasi.value.cooked ?? quasi.value.raw,
          path: templatePath,
          file,
          loc: quasi.loc
        });
      }
    },
    JSXText(textPath) {
      const value = textPath.node.value;
      if (!value || !value.trim()) return;
      checkCandidate({
        value,
        path: textPath,
        file
      });
    }
  });
}

async function main() {
  const roots = cliTargets.length
    ? cliTargets.map((target) => path.resolve(projectRoot, target))
    : defaultSearchRoots;

  const existingRoots = [];
  for (const dir of roots) {
    try {
      const stat = await fs.stat(dir);
      if (stat.isDirectory()) {
        existingRoots.push(dir);
      } else if (stat.isFile()) {
        existingRoots.push(dir);
      }
    } catch {
      // ignore missing directories
    }
  }

  if (existingRoots.length === 0) {
    console.warn("No source directories found for sensitive copy check.");
    return;
  }

  for (const root of existingRoots) {
    const files = await collectSourceFiles(root);
    for (const file of files) {
      await analyzeFile(file);
    }
  }

  if (violations.length > 0) {
    console.error("\nSensitive copy guard violations detected:");
    for (const violation of violations) {
      const rel = path.relative(projectRoot, violation.file);
      console.error(
        `  - ${rel}:${violation.line}:${violation.column} -> "${violation.value}"`
      );
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Sensitive copy check failed:", err);
  process.exitCode = 1;
});
