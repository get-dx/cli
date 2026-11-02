# Attributing vendor activity to a DX user

## First: does the table carry its own `dx_user_id`?

These tables resolve the person themselves. The direct join is the correct
one, and adding `identities` is wrong rather than redundant — it drops rows
whose identity is missing or orphaned and multiplies the rest by the
person's other accounts. `dx_user_id` is nullable, so `LEFT JOIN` when
unattributed rows matter.

- `ai_code_commit_users`
- `ai_tool_daily_metrics`
- `dx_group_memberships`
- `google_calendar_events`
- `google_calendar_users`
- `issues`
- `outlook_calendar_events`
- `pipeline_runs`
- `pull_request_commits`
- `pull_request_reviews`
- `pull_requests`
- `user_link_decisions`

```sql
JOIN dx_users ON dx_users.id = <table>.dx_user_id
```

## Everything else goes through `identities`

```sql
JOIN identities
  ON identities.source_id = <vendor>_users.id
 AND identities.source = '<source>'
JOIN dx_users
  ON dx_users.id = identities.dx_user_id
```

### Confirm the source literal

This schema snapshot does not contain verified `identities.source` values.
Before writing the join, confirm the literal against the account's live data:

```sql
SELECT DISTINCT source FROM identities
```

### Candidates for every other user table

These are unverified candidates derived from their table names. A candidate
is a starting point for a live check, never an answer. Confirm with
`SELECT DISTINCT source FROM identities`.

| Table                       | Likely `source`                    |
| --------------------------- | ---------------------------------- |
| `ado_users`                 | `ado` (unverified)                 |
| `amazon_kiro_users`         | `amazon_kiro` (unverified)         |
| `amazon_q_users`            | `amazon_q` (unverified)            |
| `asana_users`               | `asana` (unverified)               |
| `augment_code_users`        | `augment_code` (unverified)        |
| `bitbucket_server_users`    | `bitbucket_server` (unverified)    |
| `bitbucket_users`           | `bitbucket` (unverified)           |
| `claude_code_users`         | `claude_code` (unverified)         |
| `clickup_users`             | `clickup` (unverified)             |
| `coder_ai_users`            | `coder_ai` (unverified)            |
| `coderabbit_users`          | `coderabbit` (unverified)          |
| `codex_users`               | `codex` (unverified)               |
| `confluence_users`          | `confluence` (unverified)          |
| `cursor_users`              | `cursor` (unverified)              |
| `datadog_users`             | `datadog` (unverified)             |
| `firehydrant_users`         | `firehydrant` (unverified)         |
| `gemini_users`              | `gemini` (unverified)              |
| `gerrit_users`              | `gerrit` (unverified)              |
| `github_organization_users` | `github_organization` (unverified) |
| `github_users`              | `github` (unverified)              |
| `gitlab_users`              | `gitlab` (unverified)              |
| `incident_io_on_call_users` | `incident_io_on_call` (unverified) |
| `incident_io_users`         | `incident_io` (unverified)         |
| `jira_users`                | `jira` (unverified)                |
| `jsm_users`                 | `jsm` (unverified)                 |
| `launchdarkly_users`        | `launchdarkly` (unverified)        |
| `linear_users`              | `linear` (unverified)              |
| `opsgenie_users`            | `opsgenie` (unverified)            |
| `pagerduty_on_call_users`   | `pagerduty_on_call` (unverified)   |
| `pagerduty_team_users`      | `pagerduty_team` (unverified)      |
| `pagerduty_users`           | `pagerduty` (unverified)           |
| `perforce_users`            | `perforce` (unverified)            |
| `rootly_users`              | `rootly` (unverified)              |
| `servicenow_users`          | `servicenow` (unverified)          |
| `shortcut_users`            | `shortcut` (unverified)            |
| `sourcegraph_amp_users`     | `sourcegraph_amp` (unverified)     |
| `statsig_users`             | `statsig` (unverified)             |
| `windsurf_users`            | `windsurf` (unverified)            |
| `wiz_users`                 | `wiz` (unverified)                 |

### Caveats

- **Only for tables with no dx_user_id of their own** — Twelve tables resolve the person themselves and join dx_users directly; identities is the only route for the rest. Adding this hop to a table that already carries dx_user_id drops rows whose identity is missing or orphaned and multiplies the rest by the person's other accounts.
- **The source predicate is mandatory** — identities.source_id holds the primary key of whichever table identities.source names, and every vendor numbers its users from 1. Without the source predicate you will match a Jira user id against a GitHub user id that happens to share an integer, which silently inflates every per-person metric.
- **identities.source is not the unified source vocabulary** — The values here describe identity providers, not the vendor tables that feed issues and pull_requests. jira_service_management appears in identities and in no unified table. Confirm the literal with `SELECT DISTINCT source FROM identities` rather than reusing a value from a unified query.
- **Expect a few orphaned identities** — Some identity rows point at a vendor user that has since been removed upstream, so an inner join quietly drops them. The proportion is small but not zero. Use a LEFT JOIN when you are reconciling coverage and need to see the gap.
- **One DX user has many identities** — A person with a GitHub account and a Jira account has a row for each, so joining identities without constraining source multiplies rows per user. Aggregate after the join, or constrain to the one source you want.
