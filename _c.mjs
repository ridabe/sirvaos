import ts from "typescript";
import fs from "fs";
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, "utf8");
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const diags = sf.parseDiagnostics || [];
  if (!diags.length) { console.log("OK  " + f); continue; }
  console.log("ERR " + f);
  for (const d of diags.slice(0,10)) {
    const p = sf.getLineAndCharacterOfPosition(d.start);
    console.log(`  ${p.line+1}:${p.character+1} ${ts.flattenDiagnosticMessageText(d.messageText,"\n")}`);
  }
}
