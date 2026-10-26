// Copyright ScyllaDB, Inc. SPDX-License-Identifier: Apache-2.0
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {test} = require('node:test');

const workflow = readFileSync(join(__dirname, '../workflows/release.yml'), 'utf8');
const script = workflow.split('          script: |\n')[1]
  .split('\n').map(line => line.replace(/^            /, '')).join('\n');
const runScript = new (Object.getPrototypeOf(async function () {}).constructor)(
  'github', 'context', 'core', script
);

async function publish(options = {}) {
  const calls = [];
  let tagReads = 0;
  const github = {rest: {
    git: {
      getRef: async params => {
        calls.push('ref');
        assert.equal(params.ref, 'tags/v1.0.2');
        tagReads++;
        if (options.missingTag) throw {status: 404};
        return {data: {ref: 'refs/tags/v1.0.2', object: options.annotated ?
          {type: 'tag', sha: 'annotation-0'} :
          {type: 'commit', sha: options.movedTag || (options.moveAfterNotes && tagReads > 1) ? 'other' : 'commit'}}};
      },
      getTag: async params => {
        calls.push('peel');
        const depth = Number(params.tag_sha.replace('annotation-', ''));
        assert.ok(Number.isSafeInteger(depth));
        if (options.tagLookupFailure) throw new Error('Tag object unavailable');
        return {data: {object: options.cyclicTag ? {type: 'tag', sha: 'annotation-0'} :
          depth + 1 < (options.annotationDepth ?? 1) ? {type: 'tag', sha: `annotation-${depth + 1}`} :
          {type: options.nonCommitTag ? 'tree' : 'commit', sha: 'commit'}}};
      }
    },
    repos: {
      getReleaseByTag: async params => {
        calls.push('existing');
        assert.equal(params.tag, 'v1.0.2');
        if (options.lookupFailure) throw new Error('API unavailable');
        if (!options.existing) throw {status: 404};
        return {data: {tag_name: 'v1.0.2', draft: false, published_at: 'published',
          html_url: 'existing', ...options.existing}};
      },
      generateReleaseNotes: async params => {
        calls.push('notes');
        assert.equal(params.tag_name, 'v1.0.2');
        assert.equal(params.target_commitish, 'commit');
        assert.equal(params.configuration_file_path, '.github/release.yml');
        if (options.notesFailure) throw new Error('Notes unavailable');
        return {data: {name: 'v1.0.2', body: 'Filtered notes'}};
      },
      createRelease: async params => {
        calls.push('create');
        if (options.createFailure) throw new Error('Publication unavailable');
        assert.equal(params.tag_name, 'v1.0.2');
        assert.equal(params.target_commitish, 'commit');
        assert.equal(params.name, 'v1.0.2');
        assert.equal(params.body, 'Filtered notes');
        assert.equal(params.draft, false);
        assert.equal(params.prerelease, false);
        return {data: {tag_name: 'v1.0.2', draft: false, published_at: 'published',
          html_url: 'new', ...options.result}};
      }
    }
  }};
  let error;
  try {
    await runScript(github, {
      repo: {owner: 'scylladb', repo: 'go-set'},
      ref: options.ref ?? 'refs/tags/v1.0.2', sha: 'commit'
    }, {info: message => calls.push(message)});
  } catch (caught) { error = caught; }
  return {calls, error};
}

test('published tag generates filtered notes and a published release', async () => {
  const {calls, error} = await publish();
  assert.ifError(error);
  assert.deepEqual(calls, ['ref', 'existing', 'notes', 'ref', 'create', 'Published new']);
});

test('annotated tags resolve to the triggering commit', async () => {
  const {calls, error} = await publish({annotated: true});
  assert.ifError(error);
  assert.equal(calls.filter(call => call === 'peel').length, 2);
});

test('valid chains deeper than ten annotations resolve without an arbitrary ceiling', async () => {
  const {calls, error} = await publish({annotated: true, annotationDepth: 12});
  assert.ifError(error);
  assert.equal(calls.filter(call => call === 'peel').length, 24);
  assert.ok(calls.includes('create'));
});

test('repeated annotated objects fail visibly without unbounded traversal', async () => {
  const {calls, error} = await publish({annotated: true, cyclicTag: true});
  assert.match(error.message, /Cycle in annotated version tag/);
  assert.equal(calls.filter(call => call === 'peel').length, 1);
  assert.ok(!calls.includes('create'));
});

test('reruns preserve published release and curated notes', async () => {
  const {calls, error} = await publish({existing: {}});
  assert.ifError(error);
  assert.deepEqual(calls, ['ref', 'existing', 'Preserving published release existing']);
});

test('draft, unpublished or wrong-tag releases fail visibly', async () => {
  for (const existing of [{draft: true}, {published_at: null}, {tag_name: 'v1.0.1'}]) {
    const {calls, error} = await publish({existing});
    assert.ok(error);
    assert.deepEqual(calls, ['ref', 'existing']);
  }
});

test('invalid, missing, moved and non-commit tags cannot publish', async () => {
  for (const options of [{ref: 'refs/heads/master'}, {ref: 'refs/tags/v1.0.2-extra'},
    {missingTag: true}, {movedTag: true}, {moveAfterNotes: true},
    {annotated: true, cyclicTag: true}, {annotated: true, nonCommitTag: true},
    {annotated: true, tagLookupFailure: true}]) {
    const {calls, error} = await publish(options);
    assert.ok(error);
    assert.ok(!calls.includes('create'));
  }
});

test('API failures do not become successful publication', async () => {
  for (const options of [{lookupFailure: true}, {notesFailure: true}]) {
    const {calls, error} = await publish(options);
    assert.ok(error);
    assert.ok(!calls.includes('create'));
  }
  assert.ok((await publish({createFailure: true})).error);
  for (const result of [{draft: true}, {published_at: null}, {tag_name: 'v1.0.1'}]) {
    assert.ok((await publish({result})).error);
  }
});

test('release workflow uses version tags and per-tag serialization', () => {
  assert.match(workflow, /tags: \['v\[0-9\]\*\.\[0-9\]\*\.\[0-9\]\*'\]/);
  assert.match(workflow, /group: github-release-\$\{\{ github.ref \}\}/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /actions\/checkout|git push|npm publish|go mod edit/);
});
