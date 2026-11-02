# Linear tables

24 tables. Every join below is stated with the SQL to write.

## linear_allocation_rules

Details about Linear allocation rules

`source` · `lookup` · Linear

### Bridges — join through, never to

- **linear_issue_allocation_category_values**
  ```sql
  JOIN linear_allocation_rules
    ON linear_allocation_rules.id = linear_issue_allocation_category_values.rule_id
  ```

## linear_connection_organizations

Join table recording which Data Cloud connections import which Linear organization (workspace). A workspace can be imported by multiple connections, so this makes the connection-to-organization mapping many-to-many.

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_organizations**
  ```sql
  JOIN linear_organizations
    ON linear_organizations.id = linear_connection_organizations.organization_id
  ```

## linear_cycle_scope_history

Details about Linear cycle estimated points after each day from start

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_cycles**
  ```sql
  JOIN linear_cycles
    ON linear_cycles.id = linear_cycle_scope_history.cycle_id
  ```

## linear_cycles

Details about Linear cycles (sprints/iterations)

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_teams**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_cycles.team_id
  ```

### Joined from — these point here, one-to-many

- **linear_cycle_scope_history**
  ```sql
  JOIN linear_cycles
    ON linear_cycles.id = linear_cycle_scope_history.cycle_id
  ```
- **linear_issue_cycles**
  ```sql
  JOIN linear_cycles
    ON linear_cycles.id = linear_issue_cycles.cycle_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## linear_initiative_projects

Join table linking Linear initiatives to projects

`source` · `bridge` · Linear

### Joins out — this table holds the key

- **linear_initiatives**
  ```sql
  JOIN linear_initiatives
    ON linear_initiatives.id = linear_initiative_projects.initiative_id
  ```
- **linear_projects**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_initiative_projects.project_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## linear_initiatives

Details about Linear initiatives

`source` · `lookup` · Linear

### Bridges — join through, never to

- **linear_initiative_projects**
  ```sql
  JOIN linear_initiatives
    ON linear_initiatives.id = linear_initiative_projects.initiative_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## linear_issue_allocation_category_values

Details about Linear issue allocation category values

`source` · `bridge` · Linear

### Joins out — this table holds the key

- **linear_issues**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issue_allocation_category_values.linear_issue_id
  ```
- **linear_allocation_rules**
  ```sql
  JOIN linear_allocation_rules
    ON linear_allocation_rules.id = linear_issue_allocation_category_values.rule_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## linear_issue_allocations

Time allocation for Linear issue.

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_issues**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issue_allocations.issue_id
  ```
- **linear_users**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_issue_allocations.user_id
  ```

## linear_issue_cycles

Record of cycles applied to issues in Linear

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_cycles**
  ```sql
  JOIN linear_cycles
    ON linear_cycles.id = linear_issue_cycles.cycle_id
  ```
- **linear_issues**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issue_cycles.issue_id
  ```
- **linear_projects**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_issue_cycles.project_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.

## linear_issue_labels

Join table between issues and labels.

`source` · `bridge` · Linear

### Joins out — this table holds the key

- **linear_issues**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issue_labels.issue_id
  ```
- **linear_labels**
  ```sql
  JOIN linear_labels
    ON linear_labels.id = linear_issue_labels.label_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## linear_issue_state_changes

Records of the states issues have had.

`source` · `bridge` · Linear

### Joins out — this table holds the key

- **linear_issues**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issue_state_changes.issue_id
  ```
- **linear_states**
  ```sql
  JOIN linear_states
    ON linear_states.id = linear_issue_state_changes.state_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## linear_issues

Details about Linear issues

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_users**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_issues.assignee_id
  ```
- **linear_users**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_issues.creator_id
  ```
- **linear_projects**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_issues.project_id
  ```
- **linear_milestones**
  ```sql
  JOIN linear_milestones
    ON linear_milestones.id = linear_issues.milestone_id
  ```
- **linear_states**
  ```sql
  JOIN linear_states
    ON linear_states.id = linear_issues.state_id
  ```
- **linear_teams**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_issues.team_id
  ```
- **linear_users**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_issues.delegate_user_id
  ```

### Joined from — these point here, one-to-many

- **linear_issue_allocations**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issue_allocations.issue_id
  ```
- **linear_issue_cycles**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issue_cycles.issue_id
  ```
- **issues** — Linear issue · **requires `source = 'linear'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN linear_issues
    ON linear_issues.id = issues.source_table_id
   AND issues.source = 'linear'
  ```

### Bridges — join through, never to

- **linear_issue_labels**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issue_labels.issue_id
  ```
- **linear_issue_state_changes**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issue_state_changes.issue_id
  ```
- **linear_issue_allocation_category_values**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issue_allocation_category_values.linear_issue_id
  ```

### Self-join

- **linear_issues**
  ```sql
  JOIN linear_issues
    ON linear_issues.id = linear_issues.parent_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins linear_users 3 different ways** — assignee_id, creator_id, delegate_user_id. These are separate columns that frequently hold different values, so joining linear_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## linear_labels

Details about Linear labels

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_teams**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_labels.team_id
  ```

### Bridges — join through, never to

- **linear_issue_labels**
  ```sql
  JOIN linear_labels
    ON linear_labels.id = linear_issue_labels.label_id
  ```
- **linear_project_labels**
  ```sql
  JOIN linear_labels
    ON linear_labels.id = linear_project_labels.label_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## linear_milestones

Details about Linear project milestones

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_projects**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_milestones.project_id
  ```

### Joined from — these point here, one-to-many

- **linear_issues**
  ```sql
  JOIN linear_milestones
    ON linear_milestones.id = linear_issues.milestone_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## linear_organizations

Details about the Linear organization

`source` · `lookup` · Linear

### Joined from — these point here, one-to-many

- **linear_teams**
  ```sql
  JOIN linear_organizations
    ON linear_organizations.id = linear_teams.organization_id
  ```
- **linear_connection_organizations**
  ```sql
  JOIN linear_organizations
    ON linear_organizations.id = linear_connection_organizations.organization_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## linear_project_labels

Join table between Linear projects and Linear labels

`source` · `bridge` · Linear

### Joins out — this table holds the key

- **linear_projects**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_project_labels.project_id
  ```
- **linear_labels**
  ```sql
  JOIN linear_labels
    ON linear_labels.id = linear_project_labels.label_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## linear_project_members

Join table between Linear projects and Linear users

`source` · `bridge` · Linear

### Joins out — this table holds the key

- **linear_projects**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_project_members.project_id
  ```
- **linear_users**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_project_members.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## linear_project_status_changes

Records of the statuses projects have had.

`source` · `bridge` · Linear

### Joins out — this table holds the key

- **linear_projects**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_project_status_changes.project_id
  ```
- **linear_project_statuses**
  ```sql
  JOIN linear_project_statuses
    ON linear_project_statuses.id = linear_project_status_changes.status_id
  ```
- **linear_users**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_project_status_changes.actor_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## linear_project_statuses

Details about Linear project statuses. Statuses are workspace level unless they are scoped to a single team.

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_teams**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_project_statuses.team_id
  ```

### Bridges — join through, never to

- **linear_project_status_changes**
  ```sql
  JOIN linear_project_statuses
    ON linear_project_statuses.id = linear_project_status_changes.status_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## linear_projects

Details about Linear projects

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_users**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_projects.lead_id
  ```

### Joined from — these point here, one-to-many

- **linear_issues**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_issues.project_id
  ```
- **linear_milestones**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_milestones.project_id
  ```
- **linear_issue_cycles**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_issue_cycles.project_id
  ```

### Bridges — join through, never to

- **linear_project_status_changes**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_project_status_changes.project_id
  ```
- **linear_team_projects**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_team_projects.project_id
  ```
- **linear_project_members**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_project_members.project_id
  ```
- **linear_project_labels**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_project_labels.project_id
  ```
- **linear_initiative_projects**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_initiative_projects.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## linear_states

Details about Linear states

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_teams**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_states.team_id
  ```

### Joined from — these point here, one-to-many

- **linear_issues**
  ```sql
  JOIN linear_states
    ON linear_states.id = linear_issues.state_id
  ```

### Bridges — join through, never to

- **linear_issue_state_changes**
  ```sql
  JOIN linear_states
    ON linear_states.id = linear_issue_state_changes.state_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## linear_team_projects

Join table between Linear teams and Linear projects

`source` · `bridge` · Linear

### Joins out — this table holds the key

- **linear_teams**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_team_projects.team_id
  ```
- **linear_projects**
  ```sql
  JOIN linear_projects
    ON linear_projects.id = linear_team_projects.project_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## linear_teams

Details about Linear teams

`source` · `entity` · Linear

### Joins out — this table holds the key

- **linear_organizations**
  ```sql
  JOIN linear_organizations
    ON linear_organizations.id = linear_teams.organization_id
  ```

### Joined from — these point here, one-to-many

- **linear_issues**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_issues.team_id
  ```
- **linear_labels**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_labels.team_id
  ```
- **linear_project_statuses**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_project_statuses.team_id
  ```
- **linear_states**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_states.team_id
  ```
- **linear_cycles**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_cycles.team_id
  ```

### Bridges — join through, never to

- **linear_team_projects**
  ```sql
  JOIN linear_teams
    ON linear_teams.id = linear_team_projects.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## linear_users

Details about Linear users.

`source` · `lookup` · Linear

### Joined from — these point here, one-to-many

- **linear_issues**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_issues.assignee_id
  ```
- **linear_issues**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_issues.creator_id
  ```
- **linear_issues**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_issues.delegate_user_id
  ```
- **linear_issue_allocations**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_issue_allocations.user_id
  ```
- **linear_projects**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_projects.lead_id
  ```
- **identities** — linear identity · **requires `source = 'linear' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  linear_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = linear_users.id
   AND identities.source = 'linear'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **linear_project_status_changes**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_project_status_changes.actor_id
  ```
- **linear_project_members**
  ```sql
  JOIN linear_users
    ON linear_users.id = linear_project_members.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
