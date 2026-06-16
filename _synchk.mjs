import ts from "typescript";
import fs from "fs";
for (const f of ["src/pages/AdminGlobalAccess.tsx","src/pages/ClientAdmin.tsx","src/App.tsx"]) {
  const code = fs.readFileSync(f,"utf8");
  const out = ts.transpileModule(code, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
    fileName: f,
  });
  const errs = (out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  console.log(f, "=>", errs.length, "syntax errors");
  errs.slice(0,8).forEach(d=>{
    const p = d.file ? d.file.getLineAndCharacterOfPosition(d.start) : null;
    console.log("  ", p? (p.line+1)+":"+(p.character+1):"", ts.flattenDiagnosticMessageText(d.messageText,"\n"));
  });
}
