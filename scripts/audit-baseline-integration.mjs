// Offline literal-query contract audit. Never imports the application or connects to Supabase.
import ts from 'typescript';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const root = process.cwd();
const source = ts.createSourceFile('types.ts', readFileSync('src/integrations/supabase/types.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const database = source.statements.find((n) => ts.isTypeAliasDeclaration(n) && n.name.text === 'Database').type;
const member = (node, name) => node.members.find((m) => m.name?.getText(source).replaceAll('"', '') === name).type;
const publicSchema = member(database, 'public');
const columns = new Map();
for (const group of ['Tables', 'Views']) {
  for (const table of member(publicSchema, group).members) {
    columns.set(table.name.getText(source), new Set(member(table.type, 'Row').members.map((m) => m.name.getText(source))));
  }
}
const functions = new Map(member(publicSchema, 'Functions').members.map((fn) => {
  const args = member(fn.type, 'Args');
  return [fn.name.getText(source), new Map((args.members ?? []).map((m) => [m.name.getText(source), !m.questionToken]))];
}));
const buckets = new Set(['avatars', 'property-images', 'verification-docs', 'payment-screenshots', 'property-documents', 'chat-attachments']);
const findings = [], errors = [], manual = [];
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(resolve(dir, entry.name)) : [resolve(dir, entry.name)]);
}
function unwrap(node) {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node))) node = node.expression;
  return node;
}
function fromInChain(node) {
  node = unwrap(node);
  while (node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      if (node.expression.name.text === 'from' && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) return node.arguments[0].text;
      node = unwrap(node.expression.expression);
    } else if (ts.isPropertyAccessExpression(node)) node = unwrap(node.expression);
    else return null;
  }
}
for (const file of [...files(resolve('src')), ...files(resolve('supabase/functions'))].filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))) {
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const at = { file: relative(root, file).replaceAll('\\', '/'), line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 };
      const first = node.arguments[0];
      if (['from', 'rpc'].includes(method)) {
        if (first && ts.isStringLiteralLike(first)) {
          const name = first.text;
          findings.push({ ...at, method, name });
          if (method === 'from' && !columns.has(name) && !buckets.has(name)) errors.push({ ...at, problem: `Unknown table/bucket ${name}` });
          if (method === 'rpc') {
            if (!functions.has(name)) errors.push({ ...at, problem: `Unknown RPC ${name}` });
            else {
              const arg = node.arguments[1] && unwrap(node.arguments[1]);
              if (!arg || ts.isObjectLiteralExpression(arg)) {
                const provided = new Set((arg?.properties ?? []).filter(ts.isPropertyAssignment).map((p) => p.name.getText(sf).replaceAll('"', '')));
                for (const [key, required] of functions.get(name)) if (required && !provided.has(key)) errors.push({ ...at, problem: `Missing RPC argument ${name}.${key}` });
                for (const key of provided) if (!functions.get(name).has(key)) errors.push({ ...at, problem: `Unknown RPC argument ${name}.${key}` });
              } else manual.push({ ...at, problem: `Dynamic RPC arguments for ${name}` });
            }
          }
        } else manual.push({ ...at, problem: `Dynamic ${method} target` });
      }
      if (method === 'select' && first && ts.isStringLiteralLike(first)) {
        const table = fromInChain(node.expression.expression);
        if (columns.has(table)) {
          if (first.text.includes('(')) manual.push({ ...at, problem: `Embedded relationship projection on ${table}; verify PostgREST and RLS live` });
          else for (const part of first.text.split(',')) {
            const col = part.trim();
            if (col && col !== '*' && !columns.get(table).has(col)) errors.push({ ...at, problem: `Unknown selected column ${table}.${col}` });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}
const report = { scope: 'Offline literal table, simple projection and RPC argument checks; not live authorization or relationship validation', databaseContacted: false, findings, errors, manual };
const output = process.argv[2];
if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ references: findings.length, errors: errors.length, manualChecks: manual.length, details: errors }, null, 2));
if (errors.length) process.exitCode = 1;
