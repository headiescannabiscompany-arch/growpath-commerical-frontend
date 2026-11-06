"use strict";
// Explicit bounded local check; importing this file does not run it. Installed
// TypeScript only, no emit/cache/build or provider/process transport.
const path = require("node:path");
function check() {
  const ts = require("typescript"), root = path.resolve(__dirname, "..");
  const roots = ["src/api/courseGiftFinancialContract.ts", "src/api/courseCheckoutSupportClient.ts",
    "src/features/admin/CourseGiftFinancialReviewPanel.tsx", "src/features/admin/PreparedProductionCourseGiftFinancialEntry.tsx",
    "src/features/admin/CourseCheckoutSupportPanel.tsx", "src/features/admin/StagingCourseCheckoutSupportEntry.tsx",
    "src/app/admin/index.tsx"].map(p => path.join(root, p));
  const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  if (config.error) throw Error("Focused TypeScript configuration could not be read");
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram(roots, { ...parsed.options, noEmit: true, incremental: false, skipLibCheck: true });
  const wanted = new Set(roots.map(p => path.resolve(p).toLowerCase()));
  const all = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  const focused = all.filter(d => !d.file || wanted.has(path.resolve(d.file.fileName).toLowerCase()));
  for (const d of focused) {
    const location = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : null;
    process.stdout.write(JSON.stringify({ file: d.file ? path.relative(root, d.file.fileName) : null, line: location ? location.line + 1 : null,
      code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, " ") }) + "\n");
  }
  process.stdout.write(JSON.stringify({ rootFiles: roots.length, focusedDiagnostics: focused.length, dependencyDiagnosticsOutsideScope: all.length - focused.length,
    emit: false, limitation: "Focused root diagnostics only; not a full-project typecheck or build." }) + "\n");
  process.exitCode = focused.length ? 1 : 0;
}
if (require.main === module) check();
module.exports = { check };
