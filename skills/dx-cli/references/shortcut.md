# Shortcut tables

16 tables. Every join below is stated with the SQL to write.

## shortcut_custom_fields

Details about Shortcut custom fields

`source` · `lookup` · Shortcut

### Bridges — join through, never to

- **shortcut_story_custom_field_values**
  ```sql
  JOIN shortcut_custom_fields
    ON shortcut_custom_fields.id = shortcut_story_custom_field_values.custom_field_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## shortcut_epic_labels

Join table between Shortcut epics and labels

`source` · `bridge` · Shortcut

### Joins out — this table holds the key

- **shortcut_epics**
  ```sql
  JOIN shortcut_epics
    ON shortcut_epics.id = shortcut_epic_labels.epic_id
  ```
- **shortcut_labels**
  ```sql
  JOIN shortcut_labels
    ON shortcut_labels.id = shortcut_epic_labels.label_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## shortcut_epic_ownerships

Join table between Shortcut epics and their owners

`source` · `bridge` · Shortcut

### Joins out — this table holds the key

- **shortcut_epics**
  ```sql
  JOIN shortcut_epics
    ON shortcut_epics.id = shortcut_epic_ownerships.epic_id
  ```
- **shortcut_users**
  ```sql
  JOIN shortcut_users
    ON shortcut_users.id = shortcut_epic_ownerships.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## shortcut_epic_states

Workflow states for Shortcut epics

`source` · `lookup` · Shortcut

### Joined from — these point here, one-to-many

- **shortcut_epics**
  ```sql
  JOIN shortcut_epic_states
    ON shortcut_epic_states.id = shortcut_epics.epic_state_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## shortcut_epics

Details about Shortcut epics

`source` · `entity` · Shortcut

### Joins out — this table holds the key

- **shortcut_epic_states**
  ```sql
  JOIN shortcut_epic_states
    ON shortcut_epic_states.id = shortcut_epics.epic_state_id
  ```
- **shortcut_users**
  ```sql
  JOIN shortcut_users
    ON shortcut_users.id = shortcut_epics.requested_by_id
  ```

### Joined from — these point here, one-to-many

- **shortcut_stories**
  ```sql
  JOIN shortcut_epics
    ON shortcut_epics.id = shortcut_stories.epic_id
  ```

### Bridges — join through, never to

- **shortcut_epic_labels**
  ```sql
  JOIN shortcut_epics
    ON shortcut_epics.id = shortcut_epic_labels.epic_id
  ```
- **shortcut_epic_ownerships**
  ```sql
  JOIN shortcut_epics
    ON shortcut_epics.id = shortcut_epic_ownerships.epic_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## shortcut_iterations

Details about Shortcut iterations (sprints)

`source` · `lookup` · Shortcut

### Joined from — these point here, one-to-many

- **shortcut_stories**
  ```sql
  JOIN shortcut_iterations
    ON shortcut_iterations.id = shortcut_stories.iteration_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## shortcut_labels

Details about Shortcut labels

`source` · `lookup` · Shortcut

### Bridges — join through, never to

- **shortcut_epic_labels**
  ```sql
  JOIN shortcut_labels
    ON shortcut_labels.id = shortcut_epic_labels.label_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## shortcut_stories

Details about Shortcut stories

`source` · `entity` · Shortcut

### Joins out — this table holds the key

- **shortcut_users**
  ```sql
  JOIN shortcut_users
    ON shortcut_users.id = shortcut_stories.creator_id
  ```
- **shortcut_teams**
  ```sql
  JOIN shortcut_teams
    ON shortcut_teams.id = shortcut_stories.team_id
  ```
- **shortcut_workflow_states**
  ```sql
  JOIN shortcut_workflow_states
    ON shortcut_workflow_states.id = shortcut_stories.workflow_state_id
  ```
- **shortcut_epics**
  ```sql
  JOIN shortcut_epics
    ON shortcut_epics.id = shortcut_stories.epic_id
  ```
- **shortcut_iterations**
  ```sql
  JOIN shortcut_iterations
    ON shortcut_iterations.id = shortcut_stories.iteration_id
  ```

### Joined from — these point here, one-to-many

- **issues** — Shortcut story · **requires `source = 'shortcut'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN shortcut_stories
    ON shortcut_stories.id = issues.source_table_id
   AND issues.source = 'shortcut'
  ```

### Bridges — join through, never to

- **shortcut_story_ownerships**
  ```sql
  JOIN shortcut_stories
    ON shortcut_stories.id = shortcut_story_ownerships.story_id
  ```
- **shortcut_story_custom_field_values**
  ```sql
  JOIN shortcut_stories
    ON shortcut_stories.id = shortcut_story_custom_field_values.story_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## shortcut_story_custom_field_values

Values of custom fields for Shortcut stories

`source` · `bridge` · Shortcut

### Joins out — this table holds the key

- **shortcut_stories**
  ```sql
  JOIN shortcut_stories
    ON shortcut_stories.id = shortcut_story_custom_field_values.story_id
  ```
- **shortcut_custom_fields**
  ```sql
  JOIN shortcut_custom_fields
    ON shortcut_custom_fields.id = shortcut_story_custom_field_values.custom_field_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## shortcut_story_ownerships

Join table between Shortcut stories and users

`source` · `bridge` · Shortcut

### Joins out — this table holds the key

- **shortcut_stories**
  ```sql
  JOIN shortcut_stories
    ON shortcut_stories.id = shortcut_story_ownerships.story_id
  ```
- **shortcut_users**
  ```sql
  JOIN shortcut_users
    ON shortcut_users.id = shortcut_story_ownerships.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## shortcut_story_updates

Changes of workflow state of a story.

`source` · `entity` · Shortcut

### Joins out — this table holds the key

- **shortcut_workflow_states**
  ```sql
  JOIN shortcut_workflow_states
    ON shortcut_workflow_states.id = shortcut_story_updates.previous_workflow_state_id
  ```
- **shortcut_workflow_states**
  ```sql
  JOIN shortcut_workflow_states
    ON shortcut_workflow_states.id = shortcut_story_updates.new_workflow_state_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins shortcut_workflow_states 2 different ways** — previous_workflow_state_id, new_workflow_state_id. These are separate columns that frequently hold different values, so joining shortcut_workflow_states once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## shortcut_team_memberships

Join table between Shortcut users and teams

`source` · `bridge` · Shortcut

### Joins out — this table holds the key

- **shortcut_teams**
  ```sql
  JOIN shortcut_teams
    ON shortcut_teams.id = shortcut_team_memberships.team_id
  ```
- **shortcut_users**
  ```sql
  JOIN shortcut_users
    ON shortcut_users.id = shortcut_team_memberships.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## shortcut_teams

Details about Shortcut teams

`source` · `lookup` · Shortcut

### Joined from — these point here, one-to-many

- **shortcut_stories**
  ```sql
  JOIN shortcut_teams
    ON shortcut_teams.id = shortcut_stories.team_id
  ```

### Bridges — join through, never to

- **shortcut_team_memberships**
  ```sql
  JOIN shortcut_teams
    ON shortcut_teams.id = shortcut_team_memberships.team_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## shortcut_users

Details about Shortcut users

`source` · `lookup` · Shortcut

### Joined from — these point here, one-to-many

- **shortcut_stories**
  ```sql
  JOIN shortcut_users
    ON shortcut_users.id = shortcut_stories.creator_id
  ```
- **shortcut_epics**
  ```sql
  JOIN shortcut_users
    ON shortcut_users.id = shortcut_epics.requested_by_id
  ```
- **identities** — shortcut identity · **requires `source = 'shortcut' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  shortcut_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = shortcut_users.id
   AND identities.source = 'shortcut'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **shortcut_story_ownerships**
  ```sql
  JOIN shortcut_users
    ON shortcut_users.id = shortcut_story_ownerships.user_id
  ```
- **shortcut_team_memberships**
  ```sql
  JOIN shortcut_users
    ON shortcut_users.id = shortcut_team_memberships.user_id
  ```
- **shortcut_epic_ownerships**
  ```sql
  JOIN shortcut_users
    ON shortcut_users.id = shortcut_epic_ownerships.user_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## shortcut_workflow_states

Details about Shortcut workflow states

`source` · `entity` · Shortcut

### Joins out — this table holds the key

- **shortcut_workflows**
  ```sql
  JOIN shortcut_workflows
    ON shortcut_workflows.id = shortcut_workflow_states.workflow_id
  ```

### Joined from — these point here, one-to-many

- **shortcut_stories**
  ```sql
  JOIN shortcut_workflow_states
    ON shortcut_workflow_states.id = shortcut_stories.workflow_state_id
  ```
- **shortcut_story_updates**
  ```sql
  JOIN shortcut_workflow_states
    ON shortcut_workflow_states.id = shortcut_story_updates.previous_workflow_state_id
  ```
- **shortcut_story_updates**
  ```sql
  JOIN shortcut_workflow_states
    ON shortcut_workflow_states.id = shortcut_story_updates.new_workflow_state_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## shortcut_workflows

Details about Shortcut workflows

`source` · `lookup` · Shortcut

### Joined from — these point here, one-to-many

- **shortcut_workflow_states**
  ```sql
  JOIN shortcut_workflows
    ON shortcut_workflows.id = shortcut_workflow_states.workflow_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Shortcut id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
