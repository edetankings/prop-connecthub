// Read-only anonymous probes. No login, account creation, writes or file uploads.
import { loadEnv } from 'vite';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const project = 'prtrpywkwmnpowrthppg';
const origin = `https://${project}.supabase.co`;
const env = loadEnv('development', process.cwd(), 'VITE_');
if (new URL(env.VITE_SUPABASE_URL).origin !== origin || !env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) {
  throw new Error('Independent destination/public-key validation failed; no requests made.');
}
const results = [];
const requests = [];
async function get(name, path, expected, predicate) {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error('Unexpected request origin');
  requests.push({ method: 'GET', origin: url.origin, path: url.pathname });
  try {
    const response = await fetch(url, { method: 'GET', headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    const body = await response.json().catch(() => null);
    results.push({ name, status: response.status, code: typeof body?.code === 'string' ? body.code : undefined,
      passed: expected.includes(response.status) && (!predicate || predicate(body)),
      returnedRows: Array.isArray(body) ? body.length : undefined });
  } catch { results.push({ name, passed: false, error: 'Network/response error; raw details withheld' }); }
}
await get('Public listing discovery', '/rest/v1/properties?select=id,status,is_verified,listing_type&limit=20', [200],
  rows => Array.isArray(rows) && rows.every(r => r.is_verified === true && ['available','for_sale','for_rent'].includes(r.status)));
await get('Unapproved listings excluded from anonymous reads', '/rest/v1/properties?select=id&is_verified=eq.false&limit=1', [200], rows => Array.isArray(rows) && rows.length === 0);
await get('Draft and pending listings excluded from anonymous reads', '/rest/v1/properties?select=id&status=in.(draft,under_verification,payment_pending)&limit=1', [200], rows => Array.isArray(rows) && rows.length === 0);
await get('Public search query accepted', '/rest/v1/properties?select=id&or=(city.ilike.*Lagos*,state.ilike.*Lagos*)&limit=1', [200], Array.isArray);
await get('Rental listing filter accepted', '/rest/v1/properties?select=id&listing_type=eq.rental&limit=1', [200], Array.isArray);
await get('Public agent directory', '/rest/v1/public_profiles?select=id,profile_type,is_visible&limit=20', [200],
  rows => Array.isArray(rows) && rows.every(r => r.is_visible === true && ['agent','builder'].includes(r.profile_type)));
await get('Auth UUID omitted from public directory', '/rest/v1/public_profiles?select=user_id&limit=1', [400], body => body?.code === '42703');
for (const table of ['profiles','user_roles','kyc_verifications','verification_documents','messages','chat_threads','reservations','wallets','transactions','earnings','withdrawals','phone_otp_challenges','subscription_requests']) {
  await get(`Anonymous access denied: ${table}`, `/rest/v1/${table}?select=id&limit=1`, [401,403], body => body?.code === '42501');
}
await get('Auth user endpoint requires a session', '/auth/v1/user', [401,403]);
await get('Gated bank-details RPC denies anonymous execution', '/rest/v1/rpc/get_company_payment_details', [401,403], body => body?.code === '42501');
function files(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? files(resolve(dir,e.name)) : [resolve(dir,e.name)]); }
const oldConfig = readFileSync('supabase/config.toml','utf8');
const oldRef = oldConfig.match(/project_id\s*=\s*"([a-z0-9]+)"/)?.[1];
const sourceFiles = files(resolve('src')).filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
const oldApiFiles = sourceFiles.filter(f => oldRef && readFileSync(f,'utf8').includes(`${oldRef}.supabase.co`));
const previewBrokerFiles = sourceFiles.filter(f => /brokeredPreviewStorage|lovable-preview-auth|gptengineer/.test(readFileSync(f,'utf8')));
const distOldApiFiles = existsSync('dist') ? files(resolve('dist')).filter(f => /\.(js|html)$/.test(f) && oldRef && readFileSync(f,'utf8').includes(`${oldRef}.supabase.co`)) : [];
const report = { project, frontendOrigin: origin, credentialsPrinted: false, authMode: 'anonymous public publishable key; no browser sessions read',
  results, requests, sourceChecks: { oldBackendApiReferences: oldApiFiles.length, oldPreviewBrokerReferences: previewBrokerFiles.length, builtOldBackendApiReferences: distOldApiFiles.length },
  limitations: ['No connected browser or authenticated application session was available.', 'Empty results do not prove visibility controls against positive/negative fixtures.', 'No mutating RPCs, uploads, account creation, emails or operational writes were attempted.'] };
writeFileSync('database/phase-4d/anonymous-results.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ checks: results.length, passed: results.filter(r=>r.passed).length, failures: results.filter(r=>!r.passed), sourceChecks: report.sourceChecks },null,2));
if (results.some(r=>!r.passed) || oldApiFiles.length || previewBrokerFiles.length || distOldApiFiles.length) process.exitCode=1;
