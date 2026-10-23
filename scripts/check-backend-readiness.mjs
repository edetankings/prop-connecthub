// No application sessions, credentials, records or file contents are collected.
import { loadEnv } from 'vite';
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const project = 'prtrpywkwmnpowrthppg';
const output = 'database/backend-checks';
const env = loadEnv('development', process.cwd(), 'VITE_');
const target = new URL(env.VITE_SUPABASE_URL);
if (target.href !== `https://${project}.supabase.co/` || !env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_') ||
    (env.VITE_SUPABASE_PROJECT_ID && env.VITE_SUPABASE_PROJECT_ID !== project)) {
  throw new Error('Independent destination/public-configuration validation failed; no requests made.');
}
mkdirSync(output, { recursive: true });
const report = { project, credentialsPrinted: false, applicationSessionAvailable: false, checks: [] };
const check = (name, passed, evidence) => report.checks.push({ name, status: passed ? 'PASS' : 'FAIL', evidence });
check('Local Vite configuration targets the verified independent project', true, 'Exact HTTPS origin and public-key prefix verified internally; optional project ID matches.');
// Inspect the publicly served development module, never browser storage or sessions.
try {
  const response = await fetch('http://localhost:8080/src/integrations/supabase/client.ts', { redirect: 'error', signal: AbortSignal.timeout(15000) });
  const source = ts.createSourceFile('served-client.js', await response.text(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let servedEnv;
  function visit(node) {
    if (ts.isBinaryExpression(node) && node.left.getText(source) === 'import.meta.env' && ts.isObjectLiteralExpression(node.right)) {
      servedEnv = Object.fromEntries(node.right.properties.filter(ts.isPropertyAssignment).filter(p => ts.isStringLiteral(p.initializer))
        .map(p => [p.name.getText(source).replace(/^['"]|['"]$/g, ''), p.initializer.text]));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  check('Served Vite client matches independent local configuration', response.ok && servedEnv?.VITE_SUPABASE_URL === env.VITE_SUPABASE_URL &&
    servedEnv?.VITE_SUPABASE_PUBLISHABLE_KEY === env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Compared in memory; no browser interaction or network trace claimed.');
} catch {
  report.checks.push({ name: 'Served Vite client matches independent local configuration', status: 'BLOCKED', evidence: 'Local dev server not reachable or served module not available; raw response withheld.' });
}
if (process.argv.includes('--catalog')) {
  try {
    const args = ['--yes', 'supabase', 'db', 'query', '--linked', '--project-ref', project, '--output', 'json', '--file', `${output}/safety-readonly.sql`];
    const stdout = process.platform === 'win32'
      ? execFileSync('cmd.exe', ['/d', '/s', '/c', `npx ${args.join(' ')}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 })
      : execFileSync('npx', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
    const audit = JSON.parse(stdout).rows?.[0]?.audit;
    if (!audit || audit.read_only !== 'on') throw new Error('Read-only evidence missing');
    writeFileSync(`${output}/catalog-results.json`, JSON.stringify(audit, null, 2) + '\n');
    check('Catalog query enforced a read-only transaction', true, 'CLI Management API metadata access; not an application-user session.');
    check('Public tables retain RLS', audit.public_rls === true && audit.public_table_count === 30, '30 application tables; catalog observation only.');
    check('Financial settings remain locked', audit.financial.settings_count === 1 && audit.financial.money_locked === true &&
      audit.financial.referrals_locked === true && audit.financial.bank_unconfigured === true && audit.financial.verification_bonus_disabled === true, 'No payment, activation, withdrawal or payout RPC was called.');
    check('Wallets have zero recorded balances', audit.wallets_zero === true, 'Aggregate zero predicate; no individual balances exported.');
    check('No administrator role assigned', audit.accounts.admin_role_count === 0, 'Aggregate role count only.');
    check('Auth/profile mappings are intact', audit.accounts.missing_profiles === 0 && audit.accounts.orphan_profiles === 0, 'Counts only; does not establish account suitability or login capability.');
    const expected = new Map([['avatars', true], ['property-images', true], ['verification-docs', false], ['payment-screenshots', false], ['property-documents', false], ['chat-attachments', false]]);
    check('Six buckets retain intended public/private access', audit.buckets?.length === 6 && audit.buckets.every(b => expected.has(b.id) && expected.get(b.id) === b.public) && audit.storage_rls === true, 'Bucket/catalog state; no upload, download or signing performed.');
    check('Realtime publication membership is correct', JSON.stringify(audit.realtime) === JSON.stringify(['chat_threads', 'messages', 'notifications']), 'Delivery and actor isolation require application sessions and approved fixtures.');
    check('Direct financial table mutations remain ungranted', audit.financial_table_grants?.length === 6 && audit.financial_table_grants.every(g => !g.insert && !g.update && !g.delete), 'Authenticated table-wide privileges only; not an attempted mutation.');
    const prior = JSON.parse(readFileSync('database/access-audit/catalog-results.json', 'utf8')).functions;
    check('Function bodies match the previously inspected snapshot', prior.length === 69 && Object.keys(audit.function_hashes).length === 69 && prior.every(f => audit.function_hashes[f.signature] === f.body_md5), 'Hash comparison of all 69 stored bodies; no new semantic or actor execution claim.');
  } catch {
    report.checks.push({ name: 'Live catalog/safeguard inspection', status: 'BLOCKED', evidence: 'CLI/query or evidence processing did not complete; raw CLI output withheld. No application-session fallback attempted.' });
  }
}
writeFileSync(`${output}/readonly-results.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ project, results: report.checks, applicationWorkflowsExecuted: false }, null, 2));
if (report.checks.some(c => c.status === 'FAIL')) process.exitCode = 1;
