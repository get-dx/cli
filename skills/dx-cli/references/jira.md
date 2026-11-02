# Jira Cloud tables

30 tables. Every join below is stated with the SQL to write.

## jira_allocation_limits

Max dev days for users.

`source` · `entity` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_users** — capacity for user · case-insensitive match · confidence: medium
  jira_allocation_limits has no surrogate key at all, let alone a user_id. Email is the only thing tying a capacity row to a person.
  ```sql
  JOIN jira_users
    ON lower(jira_users.email) = lower(jira_allocation_limits.email)
  ```

### Caveats

- **No surrogate key** — This is the only Jira table with no id column. Email plus effective_date is the natural key.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## jira_allocation_rules

Rules for allocating Jira issues based on categories.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Bridges — join through, never to

- **jira_issue_allocation_category_values**
  ```sql
  JOIN jira_allocation_rules
    ON jira_allocation_rules.id = jira_issue_allocation_category_values.rule_id
  ```

## jira_avatars

Details of avatars used in Jira.

`source` · `entity` · Jira Cloud, Jira Data Center

No documented relationships.

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **No documented relationships** — Nothing in the schema points at this table and it points at nothing, so there is no verified way to join it. Treat any link you infer from column names as a guess until you have checked it against the data.

## jira_board_issues

Join table that links issues to the boards they are part of.

`source` · `bridge` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_boards**
  ```sql
  JOIN jira_boards
    ON jira_boards.id = jira_board_issues.board_id
  ```
- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_board_issues.issue_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jira_boards

Details of the boards within Jira.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Bridges — join through, never to

- **jira_sprint_boards**
  ```sql
  JOIN jira_boards
    ON jira_boards.id = jira_sprint_boards.board_id
  ```
- **jira_board_issues**
  ```sql
  JOIN jira_boards
    ON jira_boards.id = jira_board_issues.board_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jira_component_issues

Mapping table that links issues to components they belong to.

`source` · `bridge` · Jira Cloud

### Joins out — this table holds the key

- **jira_components**
  ```sql
  JOIN jira_components
    ON jira_components.id = jira_component_issues.component_id
  ```
- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_component_issues.issue_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jira_components

Components are subsections of a project that help you organize and categorize work in Jira.

`source` · `entity` · Jira Cloud

### Joins out — this table holds the key

- **jira_projects**
  ```sql
  JOIN jira_projects
    ON jira_projects.id = jira_components.project_id
  ```

### Bridges — join through, never to

- **jira_component_issues**
  ```sql
  JOIN jira_components
    ON jira_components.id = jira_component_issues.component_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jira_custom_fields

Details about the custom fields created in Jira.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Bridges — join through, never to

- **jira_issue_custom_field_values**
  ```sql
  JOIN jira_custom_fields
    ON jira_custom_fields.id = jira_issue_custom_field_values.custom_field_id
  ```

## jira_daily_issue_allocations

Daily time allocation for Jira issue.

`source` · `entity` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_daily_issue_allocations.issue_id
  ```
- **jira_users**
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_daily_issue_allocations.user_id
  ```

## jira_fix_versions

Records of the fix versions in Jira.

`source` · `entity` · Jira Cloud

### Joins out — this table holds the key

- **jira_projects**
  ```sql
  JOIN jira_projects
    ON jira_projects.id = jira_fix_versions.project_id
  ```

### Bridges — join through, never to

- **jira_issue_fix_versions** — fix version · confidence: high
  A plain foreign key that the published schema does not declare as one. The sibling issue_id column on the same table is declared, so this looks like an oversight rather than a deliberate omission.
  ```sql
  JOIN jira_fix_versions
    ON jira_fix_versions.id = jira_issue_fix_versions.fix_version_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jira_issue_allocation_category_values

Values assigned to Jira issues based on allocation rules.

`source` · `bridge` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_allocation_rules**
  ```sql
  JOIN jira_allocation_rules
    ON jira_allocation_rules.id = jira_issue_allocation_category_values.rule_id
  ```
- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_allocation_category_values.jira_issue_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jira_issue_allocations

Time allocation for Jira issue.

`source` · `entity` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_allocations.issue_id
  ```
- **jira_users**
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_issue_allocations.user_id
  ```

## jira_issue_custom_field_values

Record of custom fields applied to issues in Jira.

`source` · `bridge` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_custom_field_values.issue_id
  ```
- **jira_custom_fields**
  ```sql
  JOIN jira_custom_fields
    ON jira_custom_fields.id = jira_issue_custom_field_values.custom_field_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jira_issue_fix_versions

Join table that links issues to fix versions.

`source` · `bridge` · Jira Cloud

### Joins out — this table holds the key

- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_fix_versions.issue_id
  ```
- **jira_fix_versions** — fix version · confidence: high
  A plain foreign key that the published schema does not declare as one. The sibling issue_id column on the same table is declared, so this looks like an oversight rather than a deliberate omission.
  ```sql
  JOIN jira_fix_versions
    ON jira_fix_versions.id = jira_issue_fix_versions.fix_version_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jira_issue_labels

Record of labels applied to issues in Jira.

`source` · `bridge` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_labels.issue_id
  ```
- **jira_labels**
  ```sql
  JOIN jira_labels
    ON jira_labels.id = jira_issue_labels.label_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jira_issue_relationships

Flattened hierarchical relationships between Jira issues.

`source` · `bridge` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_issues** — ancestor
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_relationships.ancestor_id
  ```
- **jira_issues** — descendant
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_relationships.descendant_id
  ```

### Caveats

- **Pre-flattened closure table** — Every ancestor/descendant pair is materialized, not just direct parents. That means a grandparent appears as a row too, so counting rows will double-count unless you constrain the depth.
- **Joins jira_issues 2 different ways** — ancestor_id (ancestor), descendant_id (descendant). These are separate columns that frequently hold different values, so joining jira_issues once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jira_issue_sprints

Record of sprints applied to issues in Jira.

`source` · `bridge` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_projects** — denormalized project
  ```sql
  JOIN jira_projects
    ON jira_projects.id = jira_issue_sprints.project_id
  ```
- **jira_sprints**
  ```sql
  JOIN jira_sprints
    ON jira_sprints.id = jira_issue_sprints.sprint_id
  ```
- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_sprints.issue_id
  ```

### Caveats

- **project_id is denormalized on purpose** — The project is already on this row, so you can filter a sprint report by project without joining jira_issues at all.
- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jira_issue_status_changes

Details of the history of status changes on issues within Jira.

`source` · `entity` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_status_changes.issue_id
  ```
- **jira_statuses**
  ```sql
  JOIN jira_statuses
    ON jira_statuses.id = jira_issue_status_changes.status_id
  ```

## jira_issue_time_entries

Record of time spent on Jira issues (worklogs). This is a conditional schema that must be enabled.

`source` · `entity` · Jira Cloud

### Joins out — this table holds the key

- **jira_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_time_entries.issue_id
  ```
- **jira_users**
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_issue_time_entries.user_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jira_issue_types

Details of the issue types used within Jira.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Joined from — these point here, one-to-many

- **jira_issues**
  ```sql
  JOIN jira_issue_types
    ON jira_issue_types.id = jira_issues.issue_type_id
  ```

### Bridges — join through, never to

- **jira_project_issue_types**
  ```sql
  JOIN jira_issue_types
    ON jira_issue_types.id = jira_project_issue_types.issue_type_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the vendor id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jira_issues

Details of the issues within Jira.

`source` · `entity` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_issue_types**
  ```sql
  JOIN jira_issue_types
    ON jira_issue_types.id = jira_issues.issue_type_id
  ```
- **jira_projects**
  ```sql
  JOIN jira_projects
    ON jira_projects.id = jira_issues.project_id
  ```
- **jira_resolutions**
  ```sql
  JOIN jira_resolutions
    ON jira_resolutions.id = jira_issues.resolution_id
  ```
- **jira_statuses** — current status
  ```sql
  JOIN jira_statuses
    ON jira_statuses.id = jira_issues.status_id
  ```
- **jira_priorities**
  ```sql
  JOIN jira_priorities
    ON jira_priorities.id = jira_issues.priority_id
  ```
- **jira_users** — assignee
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_issues.user_id
  ```
- **jira_users** — creator
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_issues.creator_id
  ```
- **jira_users** — reporter
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_issues.reporter_id
  ```

### Joined from — these point here, one-to-many

- **jira_issue_status_changes**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_status_changes.issue_id
  ```
- **jira_issue_allocations**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_allocations.issue_id
  ```
- **jira_daily_issue_allocations**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_daily_issue_allocations.issue_id
  ```
- **jira_issue_time_entries**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_time_entries.issue_id
  ```
- **issues** — Jira issue · **requires `source = 'jira'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN jira_issues
    ON jira_issues.id = issues.source_table_id
   AND issues.source = 'jira'
  ```
- **github_pulls** — linked pull requests · crosses vendors · column not in the published schema · confidence: high
  The single direct link between delivery and planning data, and a plain indexed bigint pointing at jira_issues.id, so the join is exact. It is absent from the published schema, which is why neither the schema page nor the generated graph knows about it. The column is also only added when the Jira integration is on, so it will not exist at all on an instance without Jira.
  ```sql
  JOIN github_pulls
    ON github_pulls.jira_issue_id = jira_issues.id
  ```

### Bridges — join through, never to

- **jira_issue_relationships** — ancestor
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_relationships.ancestor_id
  ```
- **jira_issue_relationships** — descendant
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_relationships.descendant_id
  ```
- **jira_issue_allocation_category_values**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_allocation_category_values.jira_issue_id
  ```
- **jira_issue_labels**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_labels.issue_id
  ```
- **jira_issue_custom_field_values**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_custom_field_values.issue_id
  ```
- **jira_issue_sprints**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_sprints.issue_id
  ```
- **jira_component_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_component_issues.issue_id
  ```
- **jira_issue_fix_versions**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_issue_fix_versions.issue_id
  ```
- **jira_board_issues**
  ```sql
  JOIN jira_issues
    ON jira_issues.id = jira_board_issues.issue_id
  ```

### Self-join

- **jira_issues** — parent issue · **also match `connection_id`** · confidence: high
  Self-join on a string key rather than an id. The relationship is real but is not part of the published schema, so it is invisible to anything reading it.
  ```sql
  JOIN jira_issues AS parent
    ON parent.key = child.parent_key
   AND parent.connection_id = child.connection_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key, unique across the table, so joining jira_issues.id to a foreign key is already unambiguous. `source_id` is Jira's id and is only unique within a connection: the index on it is (connection_id, source_id). An account with more than one Jira connection will cross-join unrelated issues if you match on source_id, key or parent_key without also matching connection_id.
- **Filter deleted rows** — jira_issues, jira_sprints, jira_issue_sprints, jira_sprint_boards and jira_issue_time_entries all soft-delete. Add `deleted_at IS NULL` unless you specifically want the history.
- **Three different people columns** — user_id is the assignee, not a generic owner. creator_id and reporter_id are separate columns and frequently differ. Joining jira_users three times with distinct aliases is the only correct way to read all three.
- **Current status versus status history** — status_id is only the current state. Anything time-in-status or cycle-time related has to come from jira_issue_status_changes, which keeps the full transition log.
- **started_at and completed_at are derived** — They are computed from status category transitions, not from raw Jira fields. started_at is the earliest move into an indeterminate category, completed_at the latest move into done.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins jira_users 3 different ways** — user_id (assignee), creator_id (creator), reporter_id (reporter). These are separate columns that frequently hold different values, so joining jira_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## jira_labels

Details of all labels in Jira.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Bridges — join through, never to

- **jira_issue_labels**
  ```sql
  JOIN jira_labels
    ON jira_labels.id = jira_issue_labels.label_id
  ```

## jira_priorities

Description of each priority in Jira.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Joined from — these point here, one-to-many

- **jira_issues**
  ```sql
  JOIN jira_priorities
    ON jira_priorities.id = jira_issues.priority_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jira_project_issue_types

Record of issue types available for a project.

`source` · `bridge` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_projects**
  ```sql
  JOIN jira_projects
    ON jira_projects.id = jira_project_issue_types.project_id
  ```
- **jira_issue_types**
  ```sql
  JOIN jira_issue_types
    ON jira_issue_types.id = jira_project_issue_types.issue_type_id
  ```

### Caveats

- **Availability, not usage** — This table says which issue types a project offers. What was actually used is jira_issues.issue_type_id. The two routinely disagree, so pick deliberately.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jira_projects

Details of your Jira projects.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Joined from — these point here, one-to-many

- **jira_issues**
  ```sql
  JOIN jira_projects
    ON jira_projects.id = jira_issues.project_id
  ```
- **jira_components**
  ```sql
  JOIN jira_projects
    ON jira_projects.id = jira_components.project_id
  ```
- **jira_fix_versions**
  ```sql
  JOIN jira_projects
    ON jira_projects.id = jira_fix_versions.project_id
  ```

### Bridges — join through, never to

- **jira_project_issue_types**
  ```sql
  JOIN jira_projects
    ON jira_projects.id = jira_project_issue_types.project_id
  ```
- **jira_issue_sprints** — denormalized project
  ```sql
  JOIN jira_projects
    ON jira_projects.id = jira_issue_sprints.project_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the vendor id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jira_resolutions

Description of different resolutions within Jira.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Joined from — these point here, one-to-many

- **jira_issues**
  ```sql
  JOIN jira_resolutions
    ON jira_resolutions.id = jira_issues.resolution_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the vendor id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jira_sprint_boards

Record of sprints applied to boards in Jira.

`source` · `bridge` · Jira Cloud, Jira Data Center

### Joins out — this table holds the key

- **jira_sprints**
  ```sql
  JOIN jira_sprints
    ON jira_sprints.id = jira_sprint_boards.sprint_id
  ```
- **jira_boards**
  ```sql
  JOIN jira_boards
    ON jira_boards.id = jira_sprint_boards.board_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jira_sprints

Details of the sprints within Jira.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Bridges — join through, never to

- **jira_issue_sprints**
  ```sql
  JOIN jira_sprints
    ON jira_sprints.id = jira_issue_sprints.sprint_id
  ```
- **jira_sprint_boards**
  ```sql
  JOIN jira_sprints
    ON jira_sprints.id = jira_sprint_boards.sprint_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jira_statuses

Description of each status in Jira.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Joined from — these point here, one-to-many

- **jira_issues** — current status
  ```sql
  JOIN jira_statuses
    ON jira_statuses.id = jira_issues.status_id
  ```
- **jira_issue_status_changes**
  ```sql
  JOIN jira_statuses
    ON jira_statuses.id = jira_issue_status_changes.status_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the vendor id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jira_users

Details of the users within Jira.

`source` · `lookup` · Jira Cloud, Jira Data Center

### Joined from — these point here, one-to-many

- **jira_issues** — assignee
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_issues.user_id
  ```
- **jira_issues** — creator
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_issues.creator_id
  ```
- **jira_issues** — reporter
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_issues.reporter_id
  ```
- **jira_issue_allocations**
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_issue_allocations.user_id
  ```
- **jira_daily_issue_allocations**
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_daily_issue_allocations.user_id
  ```
- **jira_issue_time_entries**
  ```sql
  JOIN jira_users
    ON jira_users.id = jira_issue_time_entries.user_id
  ```
- **jira_allocation_limits** — capacity for user · case-insensitive match · confidence: medium
  jira_allocation_limits has no surrogate key at all, let alone a user_id. Email is the only thing tying a capacity row to a person.
  ```sql
  JOIN jira_users
    ON lower(jira_users.email) = lower(jira_allocation_limits.email)
  ```
- **identities** — jira identity · crosses vendors · confidence: high
  identities is the polymorphic bridge from a DX user to their account on any source system. The join is only valid when the discriminator column says jira.
  ```sql
  JOIN identities
    ON identities.source_id = jira_users.id
   AND identities.source = 'jira'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
  ```
- **identities** — jira identity · **requires `source = 'jira'`** · crosses vendors · confidence: high
  Confirmed against live data: every identity row with source = 'jira' matches a row in jira_users.
  ```sql
  JOIN identities
    ON identities.source_id = jira_users.id
   AND identities.source = 'jira'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
