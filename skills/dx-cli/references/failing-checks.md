# Reviewing & Resolving Failing Checks

This reference is written for an **entity owner** (typically a service owner) who needs to triage and resolve the failing scorecard checks on their entity.

A **check definition** lives on a scorecard and specifies what to evaluate. A **check result** is the outcome of running one check definition against one entity. Each result carries a `status` (e.g., `PASS`, `WARN`, or `FAIL`), and may include an `output` value, a `message`, and an `exemption_expires_at` timestamp. Resolving a failing check usually means identifying _why_ the check failed for the entity, applying a fix, and waiting for the scorecard to re-evaluate or manually triggering re-evaluation.

---

## Finding failing checks for an entity

Check results are scoped to the entity they were evaluated against, so the entry point is the entity:

```
dx catalog entities scorecards <identifier> --only-failing
dx catalog entities scorecards <identifier> --only-failing --json
dx catalog entities scorecards <identifier> --only-failing --check-ids NDQ,NTU
dx catalog entities scorecards <identifier> --only-failing --cursor <next_cursor>
```

- `--only-failing` returns only checks whose status is not `PASS`. **Exempted failing checks are still included** so owners can see what is currently being excused.
- `--check-ids` restricts the response to specific check definition IDs (discoverable from `dx scorecards info <scorecard_id> --include checks --json`).
- Use `--json` whenever you need fields the human-readable view omits — most notably `output`, `message`, `related_properties`, and `exemption_expires_at`.

Pagination follows the standard pattern: when `response_metadata.next_cursor` is present, pass it as `--cursor` to fetch the next page.

---

## Reading a check result

For each `ScorecardCheckResult` returned, the most useful fields for triage are:

| Field                   | What it tells you                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`                | `PASS`, `WARN`, or `FAIL`. `WARN` indicates an at-risk condition; treat it like a soft failure.                                                                                           |
| `message`               | Per-entity diagnostic string (Markdown supported) emitted by the check's SQL. Often explains _exactly_ why this entity failed — read this first.                                          |
| `output`                | `{ value, type }` from the check's SQL. Useful when the check measures a number (uptime %, open-bug count, etc.). Compare this against the threshold in the check definition.             |
| `related_properties`    | Catalog property identifiers that the check author flagged as the fix target. When present, the failure can often be resolved with `dx catalog entities update --property <key>=<value>`. |
| `level` / `check_group` | Where this check sits in its scorecard. Drives triage order (see below).                                                                                                                  |
| `exemption_expires_at`  | If non-null, the entity has a valid approved exemption for this check. The check is failing but is not currently counted against the entity. (Visible in `--json` output.)                |
| `executed_at`           | When this result was last computed. Useful for sanity-checking whether a recent fix has been re-evaluated yet.                                                                            |

### About exemptions

A non-null `exemption_expires_at` means someone has granted this entity a time-bound pass on a failing check. Two implications for triage:

- The failure is **not currently blocking** the entity (it does not count against the level or points total until the exemption expires).
- The owner may still want to fix it, both to remove ongoing risk and to **clear the exemption** so the entity passes the check on its own merit before the expiration date.

When listing failing checks, surface exempted ones separately from un-exempted ones, since they have very different urgency.

---

## Inspecting the check definition

A check result tells you _that_ the entity failed, but not _what_ the check is measuring. For that, look up the check definition on its scorecard:

```
dx scorecards info <scorecard_id> --include core,checks --json
```

Then find the entry in `checks[]` whose `id` matches the failing result's `id`. Useful fields on the `ScorecardCheckDefinition`:

- `name`, `description` — author-provided summary of what the check measures.
- `sql` — the actual rule that produced the result. Reading this is the most reliable way to understand the failure when `message` and `output` are not enough.
- `output_enabled`, `output_type` — whether and how `output` is surfaced.
- `level` (LEVEL scorecards) — which level the check belongs to.
- `points`, `check_group` (POINTS scorecards) — point value and grouping.

The scorecard's `id` comes from the `ScorecardReport.id` field returned by `dx catalog entities scorecards`. You can also discover IDs with `dx scorecards list --json`.

---

## Triage and prioritization

Not every failing check is equally urgent. Use the scorecard's structure to prioritize.

### LEVEL scorecards

Each `ScorecardReport` includes `current_level` (the highest level the entity has fully achieved) and `levels` (the full ladder). Each failing check's `level` field tells you which rung it blocks.

Prioritize in this order:

1. **Failing checks at `current_level + 1`** — these are the only things between the entity and its next level.
2. **Failing checks at levels above that** — informational; addressing them won't change the current level but matters for long-term progress.
3. **Failing checks at or below `current_level`** — typically the result of regressions or recently added checks; worth investigating because they may eventually drop the entity's level.

### POINTS scorecards

`ScorecardReport.points_meta` shows `{ points_achieved, points_total }` for the entity. Each check's point value is on the corresponding `ScorecardCheckDefinition.points` (from `dx scorecards info`).

Sort failing checks by `points` descending — fixing the highest-value checks moves the score the fastest.

### Initiative-bound checks

Failing checks that are part of an active **Initiative** also appear as **tasks** on the entity, with a deadline and an optional external issue link:

```
dx catalog entities tasks <identifier> --json
```

Each `Task` includes:

- `check` — the failing check (id, name, description, external URL).
- `initiative` — name, description, `complete_by` deadline, `priority`.
- `entity_check_issue` — link to a tracking issue (e.g. Jira/GitHub) when one has been created.
- `owner` — the assigned owner of the task.

Treat initiative tasks as the top priority among failing checks, since they have committed deadlines.

---

## Diagnosing with `dx studio query` (typically not needed)

If you have access to the organization's Data Cloud through `dx studio query`, you can run a check's SQL directly against the live data to see exactly what the check engine sees for your entity. This is the fastest way to verify a fix locally before waiting for the next re-evaluation.

Do not over-index on this step because the queries can often rely on data stores that are updated by external processes.

> **Access caveat:** `dx studio query` is only available to users with Data Cloud / Data Studio access in their organization. If `dx studio query --help` errors out or the call returns an authorization error, skip this step and rely on `message`, `output`, and the check's `description` instead.

The loop:

```bash
# 1. Grab the SQL from the check definition
dx scorecards info <scorecard_id> --include checks --json

# 2. Replace $entity_identifier (and any other $entity_* variables) with literal values, then run it
dx studio query "
  SELECT CASE
      WHEN count(*) > 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status
  FROM dx_catalog_entities e
    JOIN dx_catalog_entity_owners o ON e.id = o.entity_id
  WHERE e.identifier = 'my-service'
"

# 3. Inspect the row(s). If the check uses additional columns (output, message),
#    include them in the SELECT so you can see what the next evaluation will report.
```

## See [Scorecards management](./scorecards-management.md#writing-and-iterating-on-check-queries) for the full list of variables (`$entity_identifier`, `$entity_github_repo_ids`, etc.) the check engine interpolates.

## Applying a fix

The right fix depends on what the check is measuring. Common patterns:

- **Catalog property change.** When `related_properties` is set, or when the check's `description`/SQL points at a property, update the entity directly: `dx catalog entities update <identifier> --property <key>=<value>`. See [Catalog management](./catalog-management.md#update-an-entity) for property value formats.
- **Owner or alias update.** Checks that look for an owner, on-call rotation, or external system link can usually be resolved by setting `--owner-team-ids` / `--owner-user-emails` or by adding an alias (`--alias github_repo=<id>`).
- **External system change.** Many checks measure data from connected systems (GitHub, PagerDuty, SLOs, etc.). The fix lives in that system, not in DX — e.g. merging a PR, adding a CODEOWNERS entry, enabling branch protection, registering an SLO.
- **Fixes in a code base.** Some checks will evaluate dependencies, file existence, code patterns, or other code base level observations. For these a code fix or update in the underlying repository may be needed.

---

## Re-evaluation: when fixes show up

A check result reflects the entity's state at the last evaluation, not the current state. After a fix is applied, the result will continue to show `FAIL` until the scorecard re-evaluates. There are two ways re-evaluation happens:

- **Automatic.** Scorecards re-evaluate on a schedule managed by DX. The cadence is typically on the order of hours and is not currently exposed through the CLI, so expect a delay before fixes show up.
- **Manual.** From the DX UI, the entire scorecard or an individual check result can be re-evaluated immediately.

The CLI does not currently expose a trigger for manual re-evaluation; direct users to the scorecard or check in the DX web UI when they need it.

Use `executed_at` on a `ScorecardCheckResult` to confirm whether the result you're looking at reflects a post-fix evaluation.

---

## End-to-end workflow

```bash
# 1. List the entity's failing checks. Use --json to pick up message, output,
#    related_properties, and exemption_expires_at.
dx catalog entities scorecards my-service --only-failing --json

# 2. Pull deadline-bound failures so they can be prioritized first.
dx catalog entities tasks my-service --json

# 3. For each failing check, start with the result's message and output.
#    If that's enough, skip to step 5 (most common)

# 4. Optionally, pull the check definition (sql, description, points/level) for
#    more context.
dx scorecards info <scorecard_id> --include core,checks --json
dx studio query "<inlined SQL with $entity_identifier replaced>"   # optional

# 5. Apply the fix — catalog property update, owner/alias change, or upstream
#    system change.

# 6. Wait for the next scheduled re-evaluation, or trigger a manual one from
#    the DX UI for immediate confirmation. Re-run the step 1 command to verify.
dx catalog entities scorecards my-service --only-failing --check-ids <id> --json
```
