# Internal: snapshot workflow create/update API

These endpoints require DX staff approval and are excluded from published customer
API documentation. `dx_staff_approved: true` is a caller acknowledgment, not proof
of staff identity. Normal `snapshots:admin`, product-access, and PAT permissions apply.
Workflow selection remains public and requires no staff acknowledgment.

```
POST https://api.getdx.com/snapshots.settings.workflows.create
POST https://api.getdx.com/snapshots.settings.workflows.update
```

Both accept flat JSON only. Reject unsupported fields and wrong types with
`422 validation_error`. Writes return `409 snapshot_live` while settings are locked.

## Create

```json
{
  "dx_staff_approved": true,
  "name": "Build feedback",
  "prompt": "How long do you typically wait for a build?",
  "target_role": "dev",
  "target_direction": "u",
  "target_position": 0,
  "target_label": "Fast builds",
  "lower_value_is_better": true,
  "unit": "minutes",
  "options": [
    { "label": "Less than 5 minutes", "value": 2.5 },
    { "label": "5 minutes or more", "value": 10 }
  ]
}
```

Require nonblank text for name/prompt, an explicit audience (`dev`, `nondev`, `all`),
valid target direction/position, and at least two options with nonblank labels and
numeric values fitting the existing decimal scale (absolute rounded value below 100,000,000). Optional unit/target label accept text or null; lower-value preference
accepts boolean or null. Creation leaves the workflow unselected; `branch_id` is rejected.

Question translations accept name/prompt; option translations accept label. Require
multilingual support and enabled translation locales. Translated values accept text
or null. Unsupported locales and fields are rejected.

## Update

```json
{
  "dx_staff_approved": true,
  "workflow_id": "workflow_example",
  "prompt": "How long do you usually wait for a build?",
  "target_position": 1
}
```

`workflow_id` identifies an account-owned, non-deleted custom workflow. All content
and scoring fields are optional; omitted values remain unchanged. Unit, target label,
and lower-value preference can be cleared with null. Reject options, including option
translations. Existing scale and option records remain unchanged.

Question translations merge by locale/field. Null clears a translated field. Base
text changes remove stale translations, preserving other fields and locales.

Scoring changes validate against existing options. Target position is a zero-based
option index: `u` includes positions at or before it; `d` includes positions at or after
it. Changing targets can reinterpret historical scores.

## Response and errors

Create/update return only `{ "ok": true, "workflow": {...} }`, using the public
[library definition](https://github.com/get-dx/app/blob/master/docs/api/snapshots.settings.library.md).

Errors: `401 not_authed`, `403 not_authorized`, `404 not_found` for unknown/built-in/
foreign/deleted workflow IDs, `409 snapshot_live`, or `422 validation_error` with
`error_details`. Approval must be literal JSON true; strings and numbers are rejected.

## CLI invocation

Use only when internal workflow authoring is authorized. These operations are excluded from customer authoring documentation; `dx_staff_approved` is a caller acknowledgment, not a staff identity check. Do not add it automatically on behalf of a caller.

```bash
dx --json snapshots settings workflows create --from-file workflow.json
dx --json snapshots settings workflows update --from-file workflow-update.json
```

Bodies above are passed unchanged. Responses are `{ok, workflow}`. Creation leaves the workflow unselected. Select it separately with `workflowSelection set`, including every required core workflow and all other desired selected IDs.
