"""Offline source checks only: never imports a database driver or executes SQL."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--parser-path', help='Directory containing pglast 8.6')
parser.add_argument('--report', help='Write the local JSON check report')
args = parser.parse_args()
if args.parser_path:
    sys.path.insert(0, args.parser_path)
try:
    from pglast import ast, parse_sql, parse_plpgsql
    from pglast.stream import RawStream
except ImportError:
    raise SystemExit('Install pglast==8.6 outside the application, then pass --parser-path. No database is needed.')

base = Path(__file__).resolve().parent
repo = base.parents[2]
manifest = json.loads((base / 'historical-manifest.json').read_text(encoding='utf-8'))
checks = []

def check(name, condition):
    checks.append({'check': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)

historical = sorted((repo/'supabase/migrations').glob('*.sql')) + sorted((repo/'drizzle/migrations').glob('*.sql'))
check('55 historical files mapped exactly once', len(historical) == 55 and
      {p.relative_to(repo).as_posix() for p in historical} == {r['path'] for r in manifest['historical_files']} and
      len(manifest['historical_files']) == 55)
for row in manifest['historical_files']:
    check('historical hash: '+row['path'], hashlib.sha256((repo/row['path']).read_bytes()).hexdigest() == row['sha256'])
check('Drizzle journal unchanged', hashlib.sha256((repo/manifest['drizzle_journal_path']).read_bytes()).hexdigest() == manifest['drizzle_journal_sha256'])

install = (base/'install.psql').read_text(encoding='utf-8')
included = re.findall(r'^\\ir (.+)$', install, re.M)
check('installer uses exact isolated allowlist', included == [p.name for p in sorted(base.glob('[0-9][0-9]_*.sql'))])
check('installer cannot include historical paths', all('/' not in p and '\\' not in p and '..' not in p for p in included))
check('explicit approval gate and atomic transaction', 'PROP_CONNECT_INSTALL_APPROVED' in install and
      '\\set ON_ERROR_STOP on' in install and 'BEGIN;' in install and 'COMMIT;' in install)

tables, columns, functions, enums, policies, triggers, rls = set(), {}, {}, set(), set(), set(), set()
statement_count = plpgsql_count = sql_body_count = 0
baseline_text = ''
function_grants = []
private_tables = set()
for filename in included + ['readiness.sql', 'validation.sql']:
    source = (base/filename).read_text(encoding='utf-8')
    nodes = parse_sql(source)
    if filename in ['readiness.sql','validation.sql']:
        check('verification SQL is SELECT/transaction only: '+filename,
              all(isinstance(x.stmt,(ast.SelectStmt,ast.TransactionStmt)) for x in nodes))
    statement_count += len(nodes)
    if filename in included:
        baseline_text += source+'\n'
    for raw in nodes:
        n = raw.stmt
        if isinstance(n,ast.GrantStmt) and n.is_grant and n.objtype.name == 'OBJECT_FUNCTION':
            function_grants.append(n)
        if isinstance(n,ast.CreateStmt) and n.relation.schemaname == 'prop_connect_private':
            private_tables.add(n.relation.relname)
        if isinstance(n, ast.CreateFunctionStmt):
            name = '.'.join(x.sval for x in n.funcname)
            check('function defined once: '+name, name not in functions)
            functions[name] = n
            lang = next(o.arg.sval for o in n.options if o.defname == 'language')
            body = next(o.arg[0].sval for o in n.options if o.defname == 'as')
            if lang == 'plpgsql':
                parse_plpgsql(RawStream()(n))
                plpgsql_count += 1
            elif lang == 'sql':
                parse_sql(body)
                sql_body_count += 1
            search_path = next((o.arg for o in n.options if o.defname == 'set' and o.arg.name == 'search_path'), None)
            check('fixed function search_path: '+name, search_path is not None and
                  [x.val.sval for x in search_path.args] == ['public','pg_temp'])
        if isinstance(n, ast.DoStmt):
            parse_plpgsql(RawStream()(n))
        if isinstance(n, ast.CreateStmt) and n.relation.schemaname == 'public':
            t = n.relation.relname
            check('table defined once: '+t, t not in tables)
            tables.add(t)
            columns[t] = {c.colname for c in n.tableElts if isinstance(c, ast.ColumnDef)}
        if isinstance(n, ast.CreateEnumStmt):
            enums.add('.'.join(x.sval for x in n.typeName))
        if isinstance(n, ast.CreatePolicyStmt):
            key = (n.table.schemaname, n.table.relname, n.policy_name)
            check('policy defined once: '+str(key), key not in policies)
            policies.add(key)
        if isinstance(n, ast.CreateTrigStmt):
            key = (n.relation.schemaname, n.relation.relname, n.trigname)
            check('trigger defined once: '+str(key), key not in triggers)
            triggers.add(key)
        if isinstance(n, ast.AlterTableStmt) and n.relation.schemaname == 'public':
            for cmd in n.cmds:
                if cmd.subtype.name == 'AT_EnableRowSecurity':
                    rls.add(n.relation.relname)
                if isinstance(cmd.def_, ast.Constraint) and cmd.def_.pktable:
                    ref = cmd.def_.pktable
                    if ref.schemaname == 'public':
                        check('FK target table exists: '+ref.relname, ref.relname in tables)
                        check('FK local columns exist: '+cmd.def_.conname,
                              all(x.sval in columns[n.relation.relname] for x in cmd.def_.fk_attrs))
        if filename == '09_seed.sql' and isinstance(n, ast.InsertStmt):
            check('configuration-only seeds', (n.relation.schemaname,n.relation.relname) in {
                ('public','company_wallet'),('public','commission_settings'),('public','platform_settings'),
                ('prop_connect_private','installation_history')})

types = (repo/'src/integrations/supabase/types.ts').read_text(encoding='utf-8')
section = types.split('Tables: {',1)[1].split('Views: {',1)[0]
source_columns = {}
for match in re.finditer(r'^      (\w+): \{\n        Row: \{([\s\S]*?)\n        \}', section, re.M):
    source_columns[match[1]] = set(re.findall(r'^          (\w+):', match[2], re.M))
check('all 30 tables match generated type inventory', len(tables) == 30 and tables == set(source_columns))
for t, expected in source_columns.items():
    check('all historical frontend columns preserved: '+t, expected <= columns[t])
check('RLS enabled on all 30 tables', rls == tables)
check('six complete enum definitions', len(enums) == 6)
check('only two private bookkeeping tables', private_tables == {'installation_history','payment_receipts'})
for grant in function_grants:
    for obj in grant.objects:
        name = '.'.join(x.sval for x in obj.objname)
        check('granted function exists: '+name,name in functions)
        declared = [RawStream()(p.argType) for p in functions[name].parameters or ()
                    if p.mode.name in ['FUNC_PARAM_DEFAULT','FUNC_PARAM_IN','FUNC_PARAM_INOUT','FUNC_PARAM_VARIADIC']]
        requested = [RawStream()(t) for t in obj.objargs or ()]
        check('grant resolves exact input signature: '+name, declared == requested)
        roles = {r.rolename for r in grant.grantees}
        if name in {'public.ensure_wallet','public.distribute_subscription_payment',
                    'public.pay_verification_referral_bonus','prop_connect_private.credit_earning'}:
            check('internal money helper not granted to clients: '+name, not roles & {'anon','authenticated'})

allowed_names = set(functions) | {'public.'+t for t in tables} | {
    'prop_connect_private.'+t for t in private_tables}
for schema,name in sorted(set(re.findall(r'\b(public|prop_connect_private)\.(\w+)\s*\(',baseline_text))):
    check('qualified function/relation reference defined: '+schema+'.'+name,schema+'.'+name in allowed_names)

rpc_calls = set()
for root in [repo/'src', repo/'supabase/functions']:
    for p in root.rglob('*'):
        if p.suffix in ['.ts','.tsx']:
            rpc_calls.update(re.findall(r'\.rpc\(\s*["\x27]([^"\x27]+)', p.read_text(encoding='utf-8')))
check('every existing literal RPC name retained', {'public.'+x for x in rpc_calls} <= set(functions))
check('retired transaction reward function absent', 'public.reward_referrer_on_transaction' not in functions)
check('six buckets explicitly created', len(re.findall(r'INSERT INTO storage.buckets', baseline_text)) == 6)
for bucket in ['verification-docs','payment-screenshots','property-documents','chat-attachments']:
    check('private bucket: '+bucket, bool(re.search(r"VALUES\('"+bucket+"','"+bucket+"',false,",baseline_text)))
check('distinct subscription FK and event idempotency', 'subscription_id uuid' in baseline_text and 'event_key text NOT NULL UNIQUE' in baseline_text)
check('no runtime database connection in validator', not any(x in globals() for x in ['psycopg','psycopg2','asyncpg']))
check('seed ledger references reviewed historical manifest',
      hashlib.sha256((base/'historical-manifest.json').read_bytes()).hexdigest() in (base/'09_seed.sql').read_text())
for filename in included:
    check('no dangerous schema cleanup: '+filename, not re.search(r'\bDROP\s+(TABLE|SCHEMA|DATABASE)|\bTRUNCATE\b', (base/filename).read_text(), re.I))

expected = {'tables': {k: sorted(v) for k,v in sorted(columns.items())},
            'functions': sorted(functions), 'enums': sorted(enums),
            'triggers': sorted(triggers), 'policies': sorted(policies)}
expected_file = base/'expected-objects.json'
if expected_file.exists():
    # JSON converts tuples to lists.
    check('expected object inventory unchanged', json.loads(expected_file.read_text()) == json.loads(json.dumps(expected)))
editor = (base/'install-sql-editor.sql').read_text(encoding='utf-8')
editor_nodes = parse_sql(editor)
check('SQL Editor artifact contains no psql commands', not re.search(r'^\s*\\', editor, re.M))
check('SQL Editor source order matches installer',
      re.findall(r'^-- BEGIN SOURCE: (.+)$', editor, re.M) == included)
for filename in included:
    start = '-- BEGIN SOURCE: '+filename+'\n'
    end = '-- END SOURCE: '+filename+'\n'
    check('SQL Editor source preserved verbatim: '+filename,
          editor.count(start) == 1 and editor.count(end) == 1 and
          editor.split(start,1)[1].split(end,1)[0] == (base/filename).read_text(encoding='utf-8'))
expected_sql = "BEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='120s';\n" + baseline_text + 'COMMIT;'
check('SQL Editor exact ordered SQL statement equivalence',
      [RawStream()(x.stmt) for x in editor_nodes] == [RawStream()(x.stmt) for x in parse_sql(expected_sql)])
check('SQL Editor single BEGIN and COMMIT',
      [x.stmt.kind.name for x in editor_nodes if isinstance(x.stmt,ast.TransactionStmt)] == ['TRANS_STMT_BEGIN','TRANS_STMT_COMMIT'])
# Reject any new statement class until its transaction compatibility is reviewed.
transactional_types = {'TransactionStmt','VariableSetStmt','DoStmt','CreateSchemaStmt',
    'GrantStmt','CreateStmt','CreateEnumStmt','CreateSeqStmt','AlterTableStmt','IndexStmt',
    'CreateFunctionStmt','ViewStmt','CreatePolicyStmt','CreateTrigStmt','InsertStmt',
    'AlterPublicationStmt','GrantRoleStmt','AlterDefaultPrivilegesStmt'}
check('SQL Editor uses reviewed transactional statement classes',
      all(type(x.stmt).__name__ in transactional_types for x in editor_nodes))
check('SQL Editor has no concurrent index operations',
      all(not x.stmt.concurrent for x in editor_nodes if isinstance(x.stmt,ast.IndexStmt)))
checksum_file = base/'package-checksums.json'
if checksum_file.exists():
    for filename,digest in json.loads(checksum_file.read_text())['files'].items():
        check('package checksum: '+filename,hashlib.sha256((base/filename).read_bytes()).hexdigest() == digest)
report = {'status': 'offline_checks_passed', 'database_sql_executed': False,
          'runtime_validation': 'NOT PERFORMED', 'statement_count': statement_count,
          'plpgsql_bodies_parsed': plpgsql_count, 'sql_bodies_parsed': sql_body_count,
          'tables': len(tables), 'functions': len(functions), 'checks': checks}
if args.report:
    Path(args.report).write_text(json.dumps(report,indent=2)+'\n', encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k != 'checks'},indent=2))
