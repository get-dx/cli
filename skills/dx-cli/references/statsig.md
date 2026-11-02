# Statsig tables

12 tables. Every join below is stated with the SQL to write.

## statsig_experiment_groups

Groups (e.g. Control/Test) within a Statsig experiment

`source` · `entity` · Statsig

### Joins out — this table holds the key

- **statsig_experiments**
  ```sql
  JOIN statsig_experiments
    ON statsig_experiments.id = statsig_experiment_groups.experiment_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## statsig_experiment_metrics

Association between experiments and the metrics they reference

`source` · `entity` · Statsig

### Joins out — this table holds the key

- **statsig_experiments**
  ```sql
  JOIN statsig_experiments
    ON statsig_experiments.id = statsig_experiment_metrics.experiment_id
  ```
- **statsig_metrics**
  ```sql
  JOIN statsig_metrics
    ON statsig_metrics.id = statsig_experiment_metrics.metric_id
  ```

## statsig_experiment_tags

Association between experiments and tags

`source` · `bridge` · Statsig

### Joins out — this table holds the key

- **statsig_experiments**
  ```sql
  JOIN statsig_experiments
    ON statsig_experiments.id = statsig_experiment_tags.experiment_id
  ```
- **statsig_tags**
  ```sql
  JOIN statsig_tags
    ON statsig_tags.id = statsig_experiment_tags.tag_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## statsig_experiment_target_apps

Association between experiments and target apps

`source` · `bridge` · Statsig

### Joins out — this table holds the key

- **statsig_experiments**
  ```sql
  JOIN statsig_experiments
    ON statsig_experiments.id = statsig_experiment_target_apps.experiment_id
  ```
- **statsig_target_apps**
  ```sql
  JOIN statsig_target_apps
    ON statsig_target_apps.id = statsig_experiment_target_apps.target_app_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## statsig_experiments

Details about Statsig experiments

`source` · `entity` · Statsig

### Joins out — this table holds the key

- **statsig_layers**
  ```sql
  JOIN statsig_layers
    ON statsig_layers.id = statsig_experiments.layer_id
  ```
- **statsig_projects**
  ```sql
  JOIN statsig_projects
    ON statsig_projects.id = statsig_experiments.project_id
  ```
- **statsig_users**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_experiments.owner_id
  ```
- **statsig_users**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_experiments.creator_id
  ```
- **statsig_users**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_experiments.last_modifier_id
  ```

### Joined from — these point here, one-to-many

- **statsig_experiment_groups**
  ```sql
  JOIN statsig_experiments
    ON statsig_experiments.id = statsig_experiment_groups.experiment_id
  ```
- **statsig_experiment_metrics**
  ```sql
  JOIN statsig_experiments
    ON statsig_experiments.id = statsig_experiment_metrics.experiment_id
  ```

### Bridges — join through, never to

- **statsig_experiment_tags**
  ```sql
  JOIN statsig_experiments
    ON statsig_experiments.id = statsig_experiment_tags.experiment_id
  ```
- **statsig_experiment_target_apps**
  ```sql
  JOIN statsig_experiments
    ON statsig_experiments.id = statsig_experiment_target_apps.experiment_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins statsig_users 3 different ways** — owner_id, creator_id, last_modifier_id. These are separate columns that frequently hold different values, so joining statsig_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## statsig_layers

Details about Statsig layers

`source` · `entity` · Statsig

### Joins out — this table holds the key

- **statsig_users**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_layers.creator_id
  ```
- **statsig_users**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_layers.last_modifier_id
  ```

### Joined from — these point here, one-to-many

- **statsig_experiments**
  ```sql
  JOIN statsig_layers
    ON statsig_layers.id = statsig_experiments.layer_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins statsig_users 2 different ways** — creator_id, last_modifier_id. These are separate columns that frequently hold different values, so joining statsig_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## statsig_metrics

Details about Statsig metrics

`source` · `entity` · Statsig

### Joins out — this table holds the key

- **statsig_users**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_metrics.creator_id
  ```
- **statsig_users**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_metrics.owner_id
  ```

### Joined from — these point here, one-to-many

- **statsig_experiment_metrics**
  ```sql
  JOIN statsig_metrics
    ON statsig_metrics.id = statsig_experiment_metrics.metric_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins statsig_users 2 different ways** — creator_id, owner_id. These are separate columns that frequently hold different values, so joining statsig_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## statsig_project_environments

Details about Statsig environments

`source` · `entity` · Statsig

### Joins out — this table holds the key

- **statsig_projects**
  ```sql
  JOIN statsig_projects
    ON statsig_projects.id = statsig_project_environments.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## statsig_projects

Details about the Statsig project

`source` · `lookup` · Statsig

### Joined from — these point here, one-to-many

- **statsig_project_environments**
  ```sql
  JOIN statsig_projects
    ON statsig_projects.id = statsig_project_environments.project_id
  ```
- **statsig_experiments**
  ```sql
  JOIN statsig_projects
    ON statsig_projects.id = statsig_experiments.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## statsig_tags

Details about Statsig tags

`source` · `lookup` · Statsig

### Bridges — join through, never to

- **statsig_experiment_tags**
  ```sql
  JOIN statsig_tags
    ON statsig_tags.id = statsig_experiment_tags.tag_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## statsig_target_apps

Details about Statsig target apps

`source` · `lookup` · Statsig

### Bridges — join through, never to

- **statsig_experiment_target_apps**
  ```sql
  JOIN statsig_target_apps
    ON statsig_target_apps.id = statsig_experiment_target_apps.target_app_id
  ```

## statsig_users

Details about Statsig users

`source` · `lookup` · Statsig

### Joined from — these point here, one-to-many

- **statsig_layers**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_layers.creator_id
  ```
- **statsig_layers**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_layers.last_modifier_id
  ```
- **statsig_metrics**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_metrics.creator_id
  ```
- **statsig_metrics**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_metrics.owner_id
  ```
- **statsig_experiments**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_experiments.owner_id
  ```
- **statsig_experiments**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_experiments.creator_id
  ```
- **statsig_experiments**
  ```sql
  JOIN statsig_users
    ON statsig_users.id = statsig_experiments.last_modifier_id
  ```
- **identities** — statsig identity · **requires `source = 'statsig' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  statsig_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = statsig_users.id
   AND identities.source = 'statsig'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
