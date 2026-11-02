# LaunchDarkly tables

9 tables. Every join below is stated with the SQL to write.

## launchdarkly_feature_flag_environments

Association between feature flags and environments in LaunchDarkly.

`source` · `entity` · LaunchDarkly

### Joins out — this table holds the key

- **launchdarkly_project_environments**
  ```sql
  JOIN launchdarkly_project_environments
    ON launchdarkly_project_environments.id = launchdarkly_feature_flag_environments.project_environment_id
  ```
- **launchdarkly_feature_flags**
  ```sql
  JOIN launchdarkly_feature_flags
    ON launchdarkly_feature_flags.id = launchdarkly_feature_flag_environments.feature_flag_id
  ```

## launchdarkly_feature_flag_tags

Association between feature flags and tags in LaunchDarkly.

`source` · `bridge` · LaunchDarkly

### Joins out — this table holds the key

- **launchdarkly_feature_flags**
  ```sql
  JOIN launchdarkly_feature_flags
    ON launchdarkly_feature_flags.id = launchdarkly_feature_flag_tags.feature_flag_id
  ```
- **launchdarkly_tags**
  ```sql
  JOIN launchdarkly_tags
    ON launchdarkly_tags.id = launchdarkly_feature_flag_tags.tag_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## launchdarkly_feature_flags

Details about feature flags in LaunchDarkly.

`source` · `entity` · LaunchDarkly

### Joins out — this table holds the key

- **launchdarkly_projects**
  ```sql
  JOIN launchdarkly_projects
    ON launchdarkly_projects.id = launchdarkly_feature_flags.project_id
  ```
- **launchdarkly_users**
  ```sql
  JOIN launchdarkly_users
    ON launchdarkly_users.id = launchdarkly_feature_flags.maintainer_id
  ```
- **launchdarkly_teams**
  ```sql
  JOIN launchdarkly_teams
    ON launchdarkly_teams.id = launchdarkly_feature_flags.team_id
  ```

### Joined from — these point here, one-to-many

- **launchdarkly_feature_flag_environments**
  ```sql
  JOIN launchdarkly_feature_flags
    ON launchdarkly_feature_flags.id = launchdarkly_feature_flag_environments.feature_flag_id
  ```

### Bridges — join through, never to

- **launchdarkly_feature_flag_tags**
  ```sql
  JOIN launchdarkly_feature_flags
    ON launchdarkly_feature_flags.id = launchdarkly_feature_flag_tags.feature_flag_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## launchdarkly_project_environments

Details about environments for LaunchDarkly projects.

`source` · `entity` · LaunchDarkly

### Joins out — this table holds the key

- **launchdarkly_projects**
  ```sql
  JOIN launchdarkly_projects
    ON launchdarkly_projects.id = launchdarkly_project_environments.project_id
  ```

### Joined from — these point here, one-to-many

- **launchdarkly_feature_flag_environments**
  ```sql
  JOIN launchdarkly_project_environments
    ON launchdarkly_project_environments.id = launchdarkly_feature_flag_environments.project_environment_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## launchdarkly_projects

Details about LaunchDarkly projects.

`source` · `lookup` · LaunchDarkly

### Joined from — these point here, one-to-many

- **launchdarkly_project_environments**
  ```sql
  JOIN launchdarkly_projects
    ON launchdarkly_projects.id = launchdarkly_project_environments.project_id
  ```
- **launchdarkly_feature_flags**
  ```sql
  JOIN launchdarkly_projects
    ON launchdarkly_projects.id = launchdarkly_feature_flags.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## launchdarkly_tags

Details about LaunchDarkly tags.

`source` · `lookup` · LaunchDarkly

### Bridges — join through, never to

- **launchdarkly_feature_flag_tags**
  ```sql
  JOIN launchdarkly_tags
    ON launchdarkly_tags.id = launchdarkly_feature_flag_tags.tag_id
  ```

## launchdarkly_team_maintainers

Association between LaunchDarkly users and teams for maintainers.

`source` · `bridge` · LaunchDarkly

### Joins out — this table holds the key

- **launchdarkly_users**
  ```sql
  JOIN launchdarkly_users
    ON launchdarkly_users.id = launchdarkly_team_maintainers.user_id
  ```
- **launchdarkly_teams**
  ```sql
  JOIN launchdarkly_teams
    ON launchdarkly_teams.id = launchdarkly_team_maintainers.team_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## launchdarkly_teams

Details about LaunchDarkly teams.

`source` · `lookup` · LaunchDarkly

### Joined from — these point here, one-to-many

- **launchdarkly_feature_flags**
  ```sql
  JOIN launchdarkly_teams
    ON launchdarkly_teams.id = launchdarkly_feature_flags.team_id
  ```

### Bridges — join through, never to

- **launchdarkly_team_maintainers**
  ```sql
  JOIN launchdarkly_teams
    ON launchdarkly_teams.id = launchdarkly_team_maintainers.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## launchdarkly_users

Details about LaunchDarkly users.

`source` · `lookup` · LaunchDarkly

### Joined from — these point here, one-to-many

- **launchdarkly_feature_flags**
  ```sql
  JOIN launchdarkly_users
    ON launchdarkly_users.id = launchdarkly_feature_flags.maintainer_id
  ```
- **identities** — launchdarkly identity · **requires `source = 'launchdarkly' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  launchdarkly_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = launchdarkly_users.id
   AND identities.source = 'launchdarkly'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **launchdarkly_team_maintainers**
  ```sql
  JOIN launchdarkly_users
    ON launchdarkly_users.id = launchdarkly_team_maintainers.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
