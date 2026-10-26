# Releases and release notes

Push a version tag such as `v1.0.2` after following the normal maintainer release
process. The `Create GitHub release` workflow verifies that the remote tag still
points to the triggering commit, resolves annotated tags, and publishes GitHub's
generated notes using `.github/release.yml`. It does not create tags, change Go
versions, or publish packages. It accepts stable `vMAJOR.MINOR.PATCH` tags.

Rerun a failed release job from Actions after resolving the failure. Runs for the
same tag are serialized. A rerun preserves an existing published release and its
curated text. An existing draft or unpublished release fails visibly: maintainers
must deliberately publish it, or remove the draft and rerun to generate filtered
notes. The workflow never treats a draft as publication success.

## Automatic omission

The `Classify release notes` workflow uses pinned `actions/labeler` with
filename rules in `.github/labeler.yml`. It applies `omit-from-release-notes`
only when every reported changed filename matches the single support-path
union: `.github/` automation, documentation under `docs/` (`.md`, `.rst`,
`.txt`), `README.md`, Go `*_test.go` files in the root or existing set packages
(including `internal/set`), Travis and lint configuration, `.gitignore`, and
`.editorconfig`. Mixtures of these support files qualify too.

Go production source (including `doc.go`), `go.mod`, `go.sum`, `Makefile`,
`gen_set.sh`, licenses, examples, tools, and unrecognized paths stay visible.
Go source remains included even when its current contents are documentation;
filename rules cannot prove that source edits are comments only. Author,
title, `chore`, and dependency labels do not hide changes.

The workflow runs on opened, synchronized, reopened, edited, and closed PRs.
`sync-labels: true` removes the omission label when the filenames stop matching.
Before checkout or dependency installation, the workflow confirms the exact PR
number from a matching trusted PR event or a successful manual PR lookup. It
persists that number for finalization. An ordinary issue, unavailable or mismatched
lookup, missing confirmation, or changed target receives no label writes.
Confirmation survives later setup or API failure, so a confirmed PR can still
receive best-effort cleanup without another identity lookup.

The omission marker has whole-name ASCII case-insensitive identity even when
GitHub preserves capitalization in label metadata. Every actual label record must
have a nonempty string name; malformed metadata fails verification. Prefix,
suffix, and Unicode lookalike labels are distinct and remain untouched.

A trusted guard reads the same canonical YAML with locked parser and matcher
versions. It requires a positive safe PR number, a nonempty complete paginated
file listing with unique names, and stable head/base SHAs and changed-file count
around collection. The snapshot binds filenames, statuses and rename origins.
A rename from a production or unknown path stays visible even when its new name
is a support path: the workflow skips labeler and removes the omission label.
Ordinary matching and label writing remain with `actions/labeler`.

After classification, the guard repeats the full snapshot, compares its hash,
and checks the actual canonical label against the expected state. This catches
an internally skipped action lookup if it leaves the wrong label state. The
final log reports `Verified head=... base=... count=... snapshot=... omit=...;
actual label checked`. A failed or unexpectedly skipped predecessor or failed
verification triggers an attempt to remove only `omit-from-release-notes`.
That cleanup uses a trusted API step and can run even when checkout or dependency
installation failed; unrelated labels are preserved. Unsupported labeler config
shapes fail visibly and require a corresponding guard update.

The workflow checks out automation and configuration at the trusted event
`github.sha`, never the PR head. Dependencies are installed from `.github`'s
lockfile with lifecycle scripts disabled. PR code is never executed by the
labeling workflow. These are bounded before/after checks, not an atomic operation:
concurrent changes after verification remain possible. API outages can prevent
cleanup, and cancellation or infrastructure failures can prevent the final step
from running. A failed classification must be investigated even if cleanup was
attempted.

## Classify previously merged PRs

Before the next release, backfill support-only merged PRs using the workflow on
the default branch:

```sh
gh workflow run label-release-notes.yml --ref master -f pull_request=123
```

Backfills and event runs share a per-PR concurrency group. Use a current default
branch containing this guard for backfills. Dispatch input must be a canonical
positive integer, such as `123`; whitespace, signs and comma-separated lists
are rejected. The canonical label is managed automatically, including manual
uses; mixed or unknown changes must not carry it.

## Manual verification before tagging

Release publication remains asynchronous. Before pushing a tag:

1. Identify the merged PRs between the previous release and the intended release
   commit. Review their changed files, including rename origins, against the
   current `.github/labeler.yml`; mixed support changes qualify, but any runtime,
   unknown or production-origin rename must stay visible. Include previously
   merged PRs that need backfilling.
2. Run classification for those PRs and wait for the final verification step of
   every applicable run. Confirm the run used the intended trusted configuration
   revision. Open its logs and find the final `Verified` line, not just a successful
   labeler step. Investigate failed or unexpectedly skipped runs and rerun after
   resolving the cause.
3. Compare each verified head/base SHA and count with fresh PR metadata. For
   example, use `gh api repos/scylladb/go-set/pulls/123 --jq
   '{head: .head.sha, base: .base.sha, count: .changed_files}'`. Inspect the complete
   paginated files with `gh api --paginate repos/scylladb/go-set/pulls/123/files
   --jq '.[] | {filename, status, previous_filename}'`, checking that the count
   and unique filenames agree and that rename origins are included. If revisions
   or file evidence changed, rerun classification and repeat verification.
4. Check the current actual labels with `gh api --paginate
   repos/scylladb/go-set/issues/123/labels --jq '.[].name'`. Confirm that
   `omit-from-release-notes` is present exactly for qualifying support-only PRs,
   matching `omit=true` or `omit=false` in the final verification log. Resolve
   discrepancies and repeat classification before tagging.

Generated notes exclude PRs carrying the canonical label. Missing these manual
checks can leave omitted changes or unwanted support entries in published notes.
There is no automated classification barrier or scheduled follow-up
synchronization. Existing published notes are preserved and are not
retroactively rewritten; a successful backfill does not update them.

Run the focused automation suites with:

```sh
npm ci --ignore-scripts --prefix .github
node --test .github/tests/*.test.cjs
```
