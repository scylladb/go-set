// Copyright ScyllaDB, Inc. SPDX-License-Identifier: Apache-2.0
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {test} = require('node:test');
const yaml = require('js-yaml');
const guard = require('../scripts/release-notes-guard.cjs');

const repo = {owner: 'scylladb', repo: 'go-set'};
const label = 'omit-from-release-notes';
const file = (filename, extra = {}) => ({filename, status: 'modified', ...extra});
const workflowText = readFileSync(join(__dirname, '../workflows/label-release-notes.yml'), 'utf8');
const workflow = yaml.load(workflowText);
const steps = workflow.jobs.classify.steps;
const scripts = steps.filter(step => step.with?.script).map(step => step.with.script);
const targetScript = steps.find(step => step.id === 'target').with.script;
const guardScript = steps.find(step => step.id === 'guard').with.script;
const finalScript = steps.at(-1).with.script;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function fixture(options = {}) {
  const files = options.files ?? [file('README.md')];
  const labels = new Set(options.labels ?? ['unrelated']);
  const calls = [];
  const writes = [];
  let gets = 0;
  let listings = 0;
  const initial = {number: 20, head: {sha: 'head'}, base: {sha: 'base'}, changed_files: files.length};
  const github = {rest: {pulls: {
    get: async params => {
      assert.deepEqual(params, {...repo, pull_number: 20});
      calls.push('get');
      gets++;
      if (options.failGetAt === gets) throw options.getError ?? new Error('PR lookup unavailable');
      return {data: {...initial, ...options.revisions?.[gets - 1]}};
    },
    listFiles: () => {}
  }, issues: {
    listLabelsOnIssue: () => {},
    removeLabel: async params => {
      writes.push(params);
      assert.deepEqual(params, {...repo, issue_number: 20, name: label});
      calls.push('remove');
      if (options.cleanupFailure) throw new Error('Removal unavailable');
      const actual = [...labels].find(name => typeof name === 'string' &&
        name.replace(/[A-Z]/g, character => character.toLowerCase()) === label);
      if (actual === undefined) throw {status: 404};
      labels.delete(actual);
    }
  }}, paginate: async (method, params) => {
    assert.equal(params.per_page, 100);
    if (method === github.rest.pulls.listFiles) {
      assert.deepEqual(params, {...repo, pull_number: 20, per_page: 100});
      calls.push('files');
      if (options.fileFailure) throw new Error('File listing unavailable');
      return options.listings?.[listings++] ?? files;
    }
    assert.equal(method, github.rest.issues.listLabelsOnIssue);
    assert.deepEqual(params, {...repo, issue_number: 20, per_page: 100});
    calls.push('labels');
    if (options.labelFailure) throw new Error('Labels unavailable');
    return Object.hasOwn(options, 'labelRecords') ? options.labelRecords : [...labels].map(name => ({name}));
  }};
  return {github, labels, calls, writes};
}

async function adapter(f, hash, overrides = {}, load = () => guard) {
  const env = {PR_NUMBER: '20', TARGET_OUTCOME: 'success', CONFIRMED_PR: '20', CHECKOUT_OUTCOME: 'success', INSTALL_OUTCOME: 'success',
    GUARD_OUTCOME: 'success', LABELER_OUTCOME: 'success', UNSAFE_RENAME: 'false',
    SNAPSHOT_HASH: hash, ...overrides};
  const logs = [];
  const run = new AsyncFunction('github', 'context', 'core', 'require', 'process', finalScript);
  let error;
  try {
    await run(f.github, {repo}, {info: text => logs.push(text), error: text => logs.push(text)},
      load, {env});
  } catch (caught) { error = caught; }
  return {error, logs};
}

async function confirmTarget(f, options = {}) {
  const {eventName = 'workflow_dispatch', payload = {}} = options;
  const raw = Object.hasOwn(options, 'raw') ? options.raw : '20';
  const outputs = {};
  const run = new AsyncFunction('github', 'context', 'core', 'process', targetScript);
  let error;
  try {
    await run(f.github, {repo, eventName, payload},
      {setOutput: (key, value) => { outputs[key] = value; }}, {env: {PR_NUMBER: raw}});
  } catch (caught) { error = caught; }
  return {outputs, error};
}

function confirmationEnv(result) {
  return {TARGET_OUTCOME: result.error ? 'failure' : 'success',
    CONFIRMED_PR: result.outputs['confirmed-pr'] ?? ''};
}

test('canonical policy matches mixed support files and keeps runtime or unknown paths visible', async () => {
  const files = ['.github/workflows/release.yml', '.github/.hidden', 'docs/a/b.md', 'docs/guide.rst',
    'docs/a.txt', 'README.md', 'set_test.go', 'i16set/set_test.go', 'f32set/set_test.go',
    'internal/set/set_test.go', '.travis.yml', '.golangci.yml', '.gitignore', '.editorconfig'].map(name => file(name));
  assert.equal((await guard.snapshot(fixture({files}).github, repo, 20)).omit, true);
  for (const name of ['doc.go', 'go.mod', 'go.sum', 'Makefile', 'gen_set.sh', 'LICENSE',
    'examples/main.go', 'tools/tool.go', 'newset/set_test.go', 'unknown.txt', 'docs/code.go']) {
    const current = await guard.snapshot(fixture({files: [...files, file(name)]}).github, repo, 20);
    assert.equal(current.omit, false, name);
  }
});

test('renames use the actual canonical policy for both prior and current paths', async () => {
  for (const [previous, omit] of [['docs/old.md', true], ['strset/set.go', false], ['unknown', false]]) {
    const current = await guard.snapshot(fixture({files: [file('docs/new.md', {
      status: 'renamed', previous_filename: previous})]}).github, repo, 20);
    assert.equal(current.omit, omit);
    assert.equal(current.unsafeRename, !omit);
  }
});

test('unsupported config shapes fail instead of approximating a second policy', () => {
  for (const source of ['{}', 'omit-from-release-notes: []',
    'omit-from-release-notes: [{head-branch: [main]}]',
    'omit-from-release-notes: [{changed-files: [{any-glob-to-any-file: ["**"]}]}]',
    'omit-from-release-notes: [{changed-files: [{all-globs-to-all-files: []}]}]',
    'other-label: [{changed-files: [{all-globs-to-all-files: ["**"]}]}]']) {
    assert.throws(() => guard.policy(source), /Unsupported labeler configuration/);
  }
});

test('PR input rejects malformed, ambiguous and unsafe numbers', () => {
  assert.equal(guard.parseNumber('20'), 20);
  for (const value of ['', '0', '-1', '01', '1.0', '1e2', ' 20', '20\n',
    '20,21', '${{ arbitrary }}', '9007199254740992', undefined, 20]) {
    assert.throws(() => guard.parseNumber(value), /canonical positive safe PR number/);
  }
});

test('pagination requests full metadata and accepts a complete listing beyond one page', async () => {
  const f = fixture({files: Array.from({length: 105}, (_, i) => file(`docs/${i}.md`))});
  const snapshot = await guard.snapshot(f.github, repo, 20);
  assert.equal(snapshot.count, 105);
  assert.equal(snapshot.omit, true);
  assert.match(snapshot.hash, /^[0-9a-f]{64}$/);
  assert.deepEqual(f.calls, ['get', 'files', 'get']);
});

test('zero, incomplete, truncated, duplicate and invalid file evidence fail visibly', async () => {
  const cases = [
    {files: []},
    {revisions: [{changed_files: 2}, {changed_files: 2}]},
    {files: [file('README.md'), file('README.md')]},
    {files: [file('README.md', {status: 'renamed'})]},
    {files: [file('README.md', {status: undefined})]},
    {files: [file('README.md', {previous_filename: ''})]},
    {files: [file('README.md')], listings: [[]]}
  ];
  for (const options of cases) await assert.rejects(guard.snapshot(fixture(options).github, repo, 20));
});

test('head, base and count changes during collection are rejected', async () => {
  for (const changed of [{head: {sha: 'new'}}, {base: {sha: 'new'}}, {changed_files: 2}]) {
    const f = fixture({revisions: [{}, changed]});
    await assert.rejects(guard.snapshot(f.github, repo, 20), /revisions changed/);
  }
});

test('verification detects before/after revisions and filename, status or prior-path changes', async () => {
  const original = await guard.snapshot(fixture().github, repo, 20);
  for (const options of [
    {revisions: [{head: {sha: 'new'}}, {head: {sha: 'new'}}]},
    {revisions: [{base: {sha: 'new'}}, {base: {sha: 'new'}}]},
    {files: [file('docs/new.md')]},
    {files: [file('README.md', {status: 'added'})]},
    {files: [file('README.md', {status: 'renamed', previous_filename: 'docs/old.md'})]}
  ]) {
    await assert.rejects(guard.verify(fixture(options).github, repo, 20, original.hash), /snapshot changed/);
  }
  const f = fixture({labels: [label], revisions: [{}, {}, {head: {sha: 'new'}}]});
  await assert.rejects(guard.verify(f.github, repo, 20, original.hash), /revisions changed during label/);
});

test('lookup, listing and actual-label lookup failures propagate', async () => {
  await assert.rejects(guard.snapshot(fixture({failGetAt: 1}).github, repo, 20), /lookup unavailable/);
  await assert.rejects(guard.snapshot(fixture({failGetAt: 2}).github, repo, 20), /lookup unavailable/);
  await assert.rejects(guard.snapshot(fixture({fileFailure: true}).github, repo, 20), /listing unavailable/);
  const original = await guard.snapshot(fixture().github, repo, 20);
  await assert.rejects(guard.verify(fixture({labelFailure: true}).github, repo, 20, original.hash), /Labels unavailable/);
});

test('actual-label verification catches stale state after internal action skip', async () => {
  for (const [files, labels] of [[[file('README.md')], []], [[file('doc.go')], [label]]]) {
    const f = fixture({files, labels: [...labels, 'unrelated']});
    const original = await guard.snapshot(f.github, repo, 20);
    const {error} = await adapter(f, original.hash);
    assert.match(error.message, /Actual omission label/);
    assert.equal(f.labels.has(label), false);
    assert.equal(f.labels.has('unrelated'), true);
    assert.equal(f.calls.filter(call => call === 'remove').length, 1);
  }
});

test('failed final snapshot, lookup or label retrieval attempts cleanup', async () => {
  const original = await guard.snapshot(fixture().github, repo, 20);
  for (const options of [{files: [file('docs/changed.md')]}, {failGetAt: 1},
    {fileFailure: true}, {labelFailure: true}]) {
    const f = fixture({...options, labels: [label, 'unrelated']});
    const {error} = await adapter(f, original.hash);
    assert.ok(error);
    assert.deepEqual([...f.labels], ['unrelated']);
    assert.equal(f.calls.filter(call => call === 'remove').length, 1);
  }
});

test('successful verification checks actual labels and preserves unrelated labels', async () => {
  for (const [files, labels] of [[[file('README.md')], [label]], [[file('doc.go')], []]]) {
    const f = fixture({files, labels: [...labels, 'unrelated']});
    const original = await guard.snapshot(f.github, repo, 20);
    const {error, logs} = await adapter(f, original.hash);
    assert.ifError(error);
    assert.match(logs[0], /Verified head=head base=base count=1 snapshot=.*actual label checked/);
    assert.equal(f.labels.has('unrelated'), true);
    assert.ok(!f.calls.includes('remove'));
  }
});

test('intentional unsafe-rename skip removes omission label and verifies visible state', async () => {
  const f = fixture({files: [file('docs/new.md', {status: 'renamed', previous_filename: 'doc.go'})],
    labels: [label, 'unrelated']});
  const original = await guard.snapshot(f.github, repo, 20);
  const {error, logs} = await adapter(f, original.hash, {UNSAFE_RENAME: 'true', LABELER_OUTCOME: 'skipped'});
  assert.ifError(error);
  assert.match(logs[0], /omit=false; actual label checked/);
  assert.deepEqual([...f.labels], ['unrelated']);
  assert.equal(f.calls.filter(call => call === 'remove').length, 1);
});

test('failed or skipped setup, guard and labeler clean up without requiring the helper', async () => {
  for (const key of ['CHECKOUT_OUTCOME', 'INSTALL_OUTCOME', 'GUARD_OUTCOME', 'LABELER_OUTCOME']) {
    for (const outcome of ['failure', 'skipped', 'cancelled', '']) {
      const f = fixture({labels: [label, 'unrelated']});
      const {error} = await adapter(f, '', {[key]: outcome}, () => { throw new Error('Must not require helper'); });
      assert.match(error.message, /predecessor failed or unexpectedly skipped/);
      assert.deepEqual([...f.labels], ['unrelated']);
      assert.deepEqual(f.calls, ['remove']);
    }
  }
  const f = fixture({labels: [label]});
  const {error} = await adapter(f, '', {}, () => { throw new Error('Helper missing'); });
  assert.match(error.message, /Helper missing/);
  assert.deepEqual(f.calls, ['remove']);
});

test('cleanup API failures remain visible without losing the original failure or retrying', async () => {
  const f = fixture({cleanupFailure: true});
  const result = await adapter(f, '', {INSTALL_OUTCOME: 'failure'});
  assert.match(result.error.message, /predecessor failed/);
  assert.match(result.logs[0], /cleanup failed: Removal unavailable/);
  assert.deepEqual(f.calls, ['remove']);
  const unsafe = fixture({cleanupFailure: true});
  const result2 = await adapter(unsafe, '', {UNSAFE_RENAME: 'true', LABELER_OUTCOME: 'skipped'});
  assert.match(result2.error.message, /Removal unavailable/);
  assert.deepEqual(unsafe.calls, ['remove']);
});

test('workflow adapters use environment input and emit bounded verified snapshot outputs', async () => {
  const run = new AsyncFunction('github', 'context', 'core', 'require', 'process', guardScript);
  const outputs = {};
  const f = fixture();
  await run(f.github, {repo}, {setOutput: (key, value) => { outputs[key] = value; }, info: () => {}},
    () => guard, {env: {PR_NUMBER: '20'}});
  assert.deepEqual(Object.keys(outputs), ['hash', 'unsafe-rename']);
  assert.equal(outputs['unsafe-rename'], 'false');
  const invalid = await adapter(f, '', {PR_NUMBER: '01'});
  assert.match(invalid.error.message, /canonical positive safe PR number/);
  assert.equal(steps.at(-1).if, 'always()');
  const checkout = steps.find(step => step.id === 'checkout');
  const install = steps.find(step => step.id === 'install');
  assert.ok(steps.indexOf(steps.find(step => step.id === 'target')) < steps.indexOf(checkout));
  assert.ok(steps.indexOf(checkout) < steps.indexOf(install));
  assert.equal(steps.at(-1).env.TARGET_OUTCOME, '${{ steps.target.outcome }}');
  assert.equal(steps.at(-1).env.CONFIRMED_PR, '${{ steps.target.outputs.confirmed-pr }}');
  assert.equal(checkout.with.ref, '${{ github.sha }}');
  assert.equal(checkout.with['persist-credentials'], false);
  assert.equal(install.run, 'npm ci --ignore-scripts --prefix .github');
  const action = steps.find(step => step.id === 'labeler');
  assert.equal(action.if, "success() && steps.guard.outputs.unsafe-rename == 'false'");
  assert.equal(action.with['sync-labels'], true);
  assert.equal(action.with['pr-number'], '${{ env.PR_NUMBER }}');
  for (const script of scripts) assert.ok(!script.includes('${{'));
});

test('whole logical marker identity covers both omission branches and canonical cleanup', async () => {
  for (const name of [label, 'OMIT-FROM-RELEASE-NOTES', 'Omit-From-Release-Notes']) {
    const runtime = fixture({files: [file('doc.go')], labels: [name, 'unrelated']});
    const original = await guard.snapshot(runtime.github, repo, 20);
    const rejected = await adapter(runtime, original.hash);
    assert.ok(rejected.error, 'Runtime PR with a logical omission marker must be rejected');
    assert.match(rejected.error.message, /Actual omission label/);
    assert.deepEqual([...runtime.labels], ['unrelated']);
    assert.equal(runtime.calls.filter(call => call === 'remove').length, 1);
    const support = fixture({labels: [name, 'unrelated']});
    const supported = await guard.snapshot(support.github, repo, 20);
    assert.ifError((await adapter(support, supported.hash)).error);
    assert.deepEqual([...support.labels], [name, 'unrelated']);
    assert.ok(!support.calls.includes('remove'));
  }
});

test('prefix, suffix and Unicode lookalikes remain distinct and untouched', async () => {
  const names = [label + '-extra', 'prefix-' + label, label.replace('o', '\u043e'), 'unrelated'];
  for (const filename of ['doc.go', 'README.md']) {
    const f = fixture({files: [file(filename)], labels: names});
    const original = await guard.snapshot(f.github, repo, 20);
    const result = await adapter(f, original.hash);
    if (filename === 'doc.go') assert.ifError(result.error);
    else assert.match(result.error.message, /Actual omission label/);
    assert.deepEqual([...f.labels], names);
  }
});

test('every label record is validated, including records after a matching marker', async () => {
  const badRecords = [null, 'name', 0, true, [], {}, {name: undefined}, {name: null},
    {name: 20}, {name: ''}, {name: '  '}];
  for (const bad of badRecords) {
    for (const [filename, records] of [
      ['doc.go', [bad]],
      ['README.md', [bad, {name: 'OMIT-FROM-RELEASE-NOTES'}]],
      ['README.md', [{name: 'OMIT-FROM-RELEASE-NOTES'}, bad]]
    ]) {
      const f = fixture({files: [file(filename)], labels: ['Omit-From-Release-Notes', 'unrelated'],
        labelRecords: records});
      const original = await guard.snapshot(f.github, repo, 20);
      const result = await adapter(f, original.hash);
      assert.match(result.error.message, /Invalid actual label metadata/);
      assert.deepEqual([...f.labels], ['unrelated']);
    }
  }
  for (const records of [null, {}, 'labels']) {
    const f = fixture({files: [file('doc.go')], labelRecords: records});
    const original = await guard.snapshot(f.github, repo, 20);
    await assert.rejects(guard.verify(f.github, repo, 20, original.hash), /Invalid actual label metadata/);
  }
});

test('manual ordinary issues, unavailable lookups and mismatched identities receive zero writes', async () => {
  const cases = [
    {failGetAt: 1, getError: Object.assign(new Error('Not Found'), {status: 404})},
    {failGetAt: 1}, {revisions: [{number: 21}]}, {revisions: [{number: undefined}]},
    {revisions: [{number: '20'}]}, {revisions: [{number: null}]}
  ];
  for (const options of cases) {
    const f = fixture({...options, labels: [label, 'unrelated']});
    const target = await confirmTarget(f);
    assert.ok(target.error);
    assert.deepEqual(target.outputs, {});
    const result = await adapter(f, '', confirmationEnv(target), () => { throw new Error('No helper'); });
    assert.deepEqual(f.writes, []);
    assert.deepEqual([...f.labels], [label, 'unrelated']);
    assert.deepEqual(f.calls, ['get']);
    assert.match(result.error.message, /target was not confirmed/);
  }
});

test('failed, missing or changed confirmation blocks all finalizer label writes', async () => {
  for (const overrides of [
    {TARGET_OUTCOME: 'failure'}, {TARGET_OUTCOME: 'skipped'}, {TARGET_OUTCOME: ''},
    {CONFIRMED_PR: ''}, {CONFIRMED_PR: '21'}, {PR_NUMBER: '21'},
    {TARGET_OUTCOME: 'success', CONFIRMED_PR: 'true'}
  ]) {
    const f = fixture({labels: [label, 'unrelated']});
    const result = await adapter(f, '', overrides, () => { throw new Error('No helper'); });
    assert.deepEqual(f.writes, []);
    assert.deepEqual([...f.labels], [label, 'unrelated']);
    assert.deepEqual(f.calls, []);
    assert.match(result.error.message, /target was not confirmed/);
  }
});

test('invalid manual input and unsupported or mismatched events cannot confirm a target', async () => {
  for (const options of [
    {raw: '01'}, {raw: '20\n'}, {raw: undefined}, {raw: 20},
    {eventName: 'issues', payload: {issue: {number: 20}}},
    {eventName: 'pull_request_target', payload: {}},
    {eventName: 'pull_request_target', payload: {pull_request: {number: 21}}}
  ]) {
    const f = fixture({labels: [label]});
    const target = await confirmTarget(f, options);
    assert.ok(target.error);
    const result = await adapter(f, '', confirmationEnv(target));
    assert.deepEqual(f.writes, []);
    assert.deepEqual([...f.labels], [label]);
    assert.deepEqual(f.calls, []);
    assert.match(result.error.message, /target was not confirmed/);
  }
});

test('trusted PR event confirmation survives later setup failure without an API identity read', async () => {
  for (const key of ['CHECKOUT_OUTCOME', 'INSTALL_OUTCOME', 'GUARD_OUTCOME', 'LABELER_OUTCOME']) {
    const f = fixture({failGetAt: 1, labels: [label, 'unrelated']});
    const target = await confirmTarget(f, {eventName: 'pull_request_target',
      payload: {pull_request: {number: 20}}});
    assert.ifError(target.error);
    assert.deepEqual(target.outputs, {'confirmed-pr': '20'});
    assert.deepEqual(f.calls, []);
    const result = await adapter(f, '', {...confirmationEnv(target), [key]: 'failure'},
      () => { throw new Error('No helper'); });
    assert.match(result.error.message, /predecessor failed/);
    assert.deepEqual(f.calls, ['remove']);
    assert.deepEqual([...f.labels], ['unrelated']);
  }
});

test('confirmed manual PR cleanup survives later setup, helper and API failures', async () => {
  for (const key of ['CHECKOUT_OUTCOME', 'INSTALL_OUTCOME', 'GUARD_OUTCOME', 'LABELER_OUTCOME']) {
    const f = fixture({failGetAt: 2, labels: [label, 'unrelated']});
    const target = await confirmTarget(f);
    assert.ifError(target.error);
    assert.deepEqual(target.outputs, {'confirmed-pr': '20'});
    const result = await adapter(f, '', {...confirmationEnv(target), [key]: 'failure'});
    assert.match(result.error.message, /predecessor failed/);
    assert.deepEqual(f.calls, ['get', 'remove']);
    assert.deepEqual([...f.labels], ['unrelated']);
  }
  const missingHelper = fixture({labels: [label]});
  const confirmed = await confirmTarget(missingHelper);
  assert.ifError(confirmed.error);
  const result = await adapter(missingHelper, '', confirmationEnv(confirmed),
    () => { throw new Error('Helper unavailable'); });
  assert.match(result.error.message, /Helper unavailable/);
  assert.deepEqual(missingHelper.calls, ['get', 'remove']);
  const apiFailure = fixture({failGetAt: 2, labels: [label]});
  const target = await confirmTarget(apiFailure);
  assert.ifError(target.error);
  await assert.rejects(guard.snapshot(apiFailure.github, repo, 20), /lookup unavailable/);
  assert.match((await adapter(apiFailure, '', {...confirmationEnv(target), GUARD_OUTCOME: 'failure'})).error.message,
    /predecessor failed/);
  assert.deepEqual(apiFailure.calls, ['get', 'get', 'remove']);
});
