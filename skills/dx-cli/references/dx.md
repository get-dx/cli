# DX tables

51 tables. Every join below is stated with the SQL to write.

## custom_data

Custom data table for storing arbitrary data.

`source` · `entity` · DX

No documented relationships.

### Caveats

- **No documented relationships** — Nothing in the schema points at this table and it points at nothing, so there is no verified way to join it. Treat any link you infer from column names as a guess until you have checked it against the data.

## custom_metrics

Custom metrics table for storing arbitrary metrics.

`source` · `entity` · DX

No documented relationships.

### Caveats

- **No documented relationships** — Nothing in the schema points at this table and it points at nothing, so there is no verified way to join it. Treat any link you infer from column names as a guess until you have checked it against the data.

## dx_accounts

Data about your DX account.

`source` · `lookup` · DX

### Joined from — these point here, one-to-many

- **dx_snapshots**
  ```sql
  JOIN dx_accounts
    ON dx_accounts.id = dx_snapshots.account_id
  ```
- **dx_tag_groups**
  ```sql
  JOIN dx_accounts
    ON dx_accounts.id = dx_tag_groups.account_id
  ```
- **dx_tags**
  ```sql
  JOIN dx_accounts
    ON dx_accounts.id = dx_tags.account_id
  ```
- **dx_team_hierarchy_levels** — confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN dx_accounts
    ON dx_accounts.id = dx_team_hierarchy_levels.account_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_catalog_entities

Main table containing entities in the DX Catalog.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_catalog_entity_types**
  ```sql
  JOIN dx_catalog_entity_types
    ON dx_catalog_entity_types.id = dx_catalog_entities.entity_type_id
  ```

### Joined from — these point here, one-to-many

- **dx_catalog_entity_aliases**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_aliases.entity_id
  ```
- **dx_catalog_entity_incidents**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_incidents.entity_id
  ```

### Bridges — join through, never to

- **dx_catalog_entity_owners**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_owners.entity_id
  ```
- **dx_catalog_entity_relations**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_relations.source_entity_id
  ```
- **dx_catalog_entity_relations**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_relations.target_entity_id
  ```
- **dx_catalog_entity_properties**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_properties.entity_id
  ```

### Self-join

- **dx_catalog_entities**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entities.domain_entity_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_catalog_entity_alias_entries

Entries for each alias.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_catalog_entity_aliases**
  ```sql
  JOIN dx_catalog_entity_aliases
    ON dx_catalog_entity_aliases.id = dx_catalog_entity_alias_entries.entity_alias_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_catalog_entity_aliases

Aliases that connect an entity to an external system for source control, deployment, etc.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_catalog_entities**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_aliases.entity_id
  ```

### Joined from — these point here, one-to-many

- **dx_catalog_entity_alias_entries**
  ```sql
  JOIN dx_catalog_entity_aliases
    ON dx_catalog_entity_aliases.id = dx_catalog_entity_alias_entries.entity_alias_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_catalog_entity_incidents

Join table for incidents to entities to unify incident data from various sources.

`source` · `entity` · DX

### Joins out — this table holds the key

- **incidents**
  ```sql
  JOIN incidents
    ON incidents.id = dx_catalog_entity_incidents.incident_id
  ```
- **dx_catalog_entities**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_incidents.entity_id
  ```

## dx_catalog_entity_owners

Owners of entities in the DX Catalog. There is a many-to-many relationship between entities and teams.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_catalog_entities**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_owners.entity_id
  ```
- **dx_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_catalog_entity_owners.team_id
  ```
- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_catalog_entity_owners.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_catalog_entity_properties

Properties configured for each entity.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_catalog_entities**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_properties.entity_id
  ```
- **dx_catalog_properties**
  ```sql
  JOIN dx_catalog_properties
    ON dx_catalog_properties.id = dx_catalog_entity_properties.property_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_catalog_entity_relations

Actual relationships between specific entities in the DX Catalog.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_catalog_relations**
  ```sql
  JOIN dx_catalog_relations
    ON dx_catalog_relations.id = dx_catalog_entity_relations.relation_id
  ```
- **dx_catalog_entities**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_relations.source_entity_id
  ```
- **dx_catalog_entities**
  ```sql
  JOIN dx_catalog_entities
    ON dx_catalog_entities.id = dx_catalog_entity_relations.target_entity_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins dx_catalog_entities 2 different ways** — source_entity_id, target_entity_id. These are separate columns that frequently hold different values, so joining dx_catalog_entities once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_catalog_entity_types

Types of entities in the DX Catalog.

`source` · `lookup` · DX

### Joined from — these point here, one-to-many

- **dx_catalog_entities**
  ```sql
  JOIN dx_catalog_entity_types
    ON dx_catalog_entity_types.id = dx_catalog_entities.entity_type_id
  ```
- **dx_catalog_relations**
  ```sql
  JOIN dx_catalog_entity_types
    ON dx_catalog_entity_types.id = dx_catalog_relations.source_entity_type_id
  ```
- **dx_catalog_relations**
  ```sql
  JOIN dx_catalog_entity_types
    ON dx_catalog_entity_types.id = dx_catalog_relations.target_entity_type_id
  ```
- **dx_catalog_properties**
  ```sql
  JOIN dx_catalog_entity_types
    ON dx_catalog_entity_types.id = dx_catalog_properties.entity_type_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_catalog_properties

Properties that can be configured for each entity. Each property is associated with an entity type.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_catalog_entity_types**
  ```sql
  JOIN dx_catalog_entity_types
    ON dx_catalog_entity_types.id = dx_catalog_properties.entity_type_id
  ```

### Bridges — join through, never to

- **dx_catalog_entity_properties**
  ```sql
  JOIN dx_catalog_properties
    ON dx_catalog_properties.id = dx_catalog_entity_properties.property_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_catalog_relations

Defines relationship types between entity types in the DX Catalog.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_catalog_entity_types**
  ```sql
  JOIN dx_catalog_entity_types
    ON dx_catalog_entity_types.id = dx_catalog_relations.source_entity_type_id
  ```
- **dx_catalog_entity_types**
  ```sql
  JOIN dx_catalog_entity_types
    ON dx_catalog_entity_types.id = dx_catalog_relations.target_entity_type_id
  ```

### Bridges — join through, never to

- **dx_catalog_entity_relations**
  ```sql
  JOIN dx_catalog_relations
    ON dx_catalog_relations.id = dx_catalog_entity_relations.relation_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins dx_catalog_entity_types 2 different ways** — source_entity_type_id, target_entity_type_id. These are separate columns that frequently hold different values, so joining dx_catalog_entity_types once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## dx_group_memberships

Linking table between DX groups and DX users.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_group_memberships.dx_user_id
  ```
- **dx_groups**
  ```sql
  JOIN dx_groups
    ON dx_groups.source_id = dx_group_memberships.dx_group_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_groups

DX Groups.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_groups.owner_id
  ```

### Bridges — join through, never to

- **dx_group_memberships**
  ```sql
  JOIN dx_groups
    ON dx_groups.source_id = dx_group_memberships.dx_group_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_onboarding_factors

Factors that are surveyed about for the onboarding survey.

`source` · `lookup` · DX

### Bridges — join through, never to

- **dx_onboarding_response_factors**
  ```sql
  JOIN dx_onboarding_factors
    ON dx_onboarding_factors.id = dx_onboarding_response_factors.factor_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_onboarding_hires

Onboarding data for users with start_date set including onboarding survey responses and first contribution metrics.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_onboarding_hires.user_id
  ```
- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_onboarding_hires.sender_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Joins dx_users 2 different ways** — user_id, sender_id. These are separate columns that frequently hold different values, so joining dx_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## dx_onboarding_response_factors

User responses to the onboarding survey sentiment questions.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_onboarding_factors**
  ```sql
  JOIN dx_onboarding_factors
    ON dx_onboarding_factors.id = dx_onboarding_response_factors.factor_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_platform_events

DX PlatformX events.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_platform_projects**
  ```sql
  JOIN dx_platform_projects
    ON dx_platform_projects.id = dx_platform_events.project_id
  ```
- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_platform_events.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_platform_projects

DX PlatformX projects.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_platform_projects.creator_user_id
  ```

### Joined from — these point here, one-to-many

- **dx_platform_events**
  ```sql
  JOIN dx_platform_projects
    ON dx_platform_projects.id = dx_platform_events.project_id
  ```
- **dx_platform_surveys**
  ```sql
  JOIN dx_platform_projects
    ON dx_platform_projects.id = dx_platform_surveys.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_platform_question_options

DX PlatformX survey question options.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_platform_questions**
  ```sql
  JOIN dx_platform_questions
    ON dx_platform_questions.survey_id = dx_platform_question_options.question_id
  ```

### Bridges — join through, never to

- **dx_platform_response_answers**
  ```sql
  JOIN dx_platform_question_options
    ON dx_platform_question_options.question_id = dx_platform_response_answers.option_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## dx_platform_questions

DX PlatformX survey questions.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_platform_surveys**
  ```sql
  JOIN dx_platform_surveys
    ON dx_platform_surveys.source_id = dx_platform_questions.survey_id
  ```

### Joined from — these point here, one-to-many

- **dx_platform_question_options**
  ```sql
  JOIN dx_platform_questions
    ON dx_platform_questions.survey_id = dx_platform_question_options.question_id
  ```

### Bridges — join through, never to

- **dx_platform_response_answers**
  ```sql
  JOIN dx_platform_questions
    ON dx_platform_questions.survey_id = dx_platform_response_answers.question_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## dx_platform_response_answers

DX PlatformX survey response answers.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_platform_responses**
  ```sql
  JOIN dx_platform_responses
    ON dx_platform_responses.source_id = dx_platform_response_answers.response_id
  ```
- **dx_platform_questions**
  ```sql
  JOIN dx_platform_questions
    ON dx_platform_questions.survey_id = dx_platform_response_answers.question_id
  ```
- **dx_platform_question_options**
  ```sql
  JOIN dx_platform_question_options
    ON dx_platform_question_options.question_id = dx_platform_response_answers.option_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_platform_responses

DX PlatformX survey responses.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_platform_surveys**
  ```sql
  JOIN dx_platform_surveys
    ON dx_platform_surveys.source_id = dx_platform_responses.survey_id
  ```
- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_platform_responses.user_id
  ```

### Bridges — join through, never to

- **dx_platform_response_answers**
  ```sql
  JOIN dx_platform_responses
    ON dx_platform_responses.source_id = dx_platform_response_answers.response_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_platform_surveys

DX PlatformX surveys.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_platform_projects**
  ```sql
  JOIN dx_platform_projects
    ON dx_platform_projects.id = dx_platform_surveys.project_id
  ```

### Joined from — these point here, one-to-many

- **dx_platform_questions**
  ```sql
  JOIN dx_platform_surveys
    ON dx_platform_surveys.source_id = dx_platform_questions.survey_id
  ```
- **dx_platform_responses**
  ```sql
  JOIN dx_platform_surveys
    ON dx_platform_surveys.source_id = dx_platform_responses.survey_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_snapshot_allocation_items

The categories respondents allocate percentages across for an allocation question.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_snapshot_allocation_questions**
  ```sql
  JOIN dx_snapshot_allocation_questions
    ON dx_snapshot_allocation_questions.id = dx_snapshot_allocation_items.question_id
  ```
- **dx_snapshots**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_allocation_items.snapshot_id
  ```

### Joined from — these point here, one-to-many

- **dx_snapshot_allocation_scores**
  ```sql
  JOIN dx_snapshot_allocation_items
    ON dx_snapshot_allocation_items.id = dx_snapshot_allocation_scores.item_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_snapshot_allocation_questions

Allocation questions presented to users in a snapshot, including custom allocation questions.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_snapshots**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_allocation_questions.snapshot_id
  ```

### Joined from — these point here, one-to-many

- **dx_snapshot_allocation_items**
  ```sql
  JOIN dx_snapshot_allocation_questions
    ON dx_snapshot_allocation_questions.id = dx_snapshot_allocation_items.question_id
  ```
- **dx_snapshot_allocation_scores**
  ```sql
  JOIN dx_snapshot_allocation_questions
    ON dx_snapshot_allocation_questions.id = dx_snapshot_allocation_scores.question_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_snapshot_allocation_scores

Average percentage of time allocated to each allocation question item by team during a snapshot.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_snapshot_teams**
  ```sql
  JOIN dx_snapshot_teams
    ON dx_snapshot_teams.id = dx_snapshot_allocation_scores.snapshot_team_id
  ```
- **dx_snapshot_allocation_questions**
  ```sql
  JOIN dx_snapshot_allocation_questions
    ON dx_snapshot_allocation_questions.id = dx_snapshot_allocation_scores.question_id
  ```
- **dx_snapshot_allocation_items**
  ```sql
  JOIN dx_snapshot_allocation_items
    ON dx_snapshot_allocation_items.id = dx_snapshot_allocation_scores.item_id
  ```
- **dx_snapshots**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_allocation_scores.snapshot_id
  ```
- **dx_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_snapshot_allocation_scores.team_id
  ```

## dx_snapshot_items

Record of each item presented to users in a snapshot.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_snapshots**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_items.snapshot_id
  ```

### Joined from — these point here, one-to-many

- **dx_snapshot_team_scores**
  ```sql
  JOIN dx_snapshot_items
    ON dx_snapshot_items.id = dx_snapshot_team_scores.item_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_snapshot_team_hierarchies

The hierarchy of snapshot teams. Data is modeled in a tree structure.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_snapshot_teams**
  ```sql
  JOIN dx_snapshot_teams
    ON dx_snapshot_teams.id = dx_snapshot_team_hierarchies.ancestor_id
  ```
- **dx_snapshot_teams**
  ```sql
  JOIN dx_snapshot_teams
    ON dx_snapshot_teams.id = dx_snapshot_team_hierarchies.descendant_id
  ```

### Caveats

- **Joins dx_snapshot_teams 2 different ways** — ancestor_id, descendant_id. These are separate columns that frequently hold different values, so joining dx_snapshot_teams once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_snapshot_team_scores

Scores for teams during a given snapshot.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_snapshot_teams**
  ```sql
  JOIN dx_snapshot_teams
    ON dx_snapshot_teams.id = dx_snapshot_team_scores.snapshot_team_id
  ```
- **dx_snapshot_items**
  ```sql
  JOIN dx_snapshot_items
    ON dx_snapshot_items.id = dx_snapshot_team_scores.item_id
  ```
- **dx_snapshots**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_team_scores.snapshot_id
  ```
- **dx_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_snapshot_team_scores.team_id
  ```

## dx_snapshot_teams

History of teams at the time a snapshot occurred.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_snapshots**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_teams.snapshot_id
  ```
- **dx_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_snapshot_teams.team_id
  ```

### Joined from — these point here, one-to-many

- **dx_snapshot_team_scores**
  ```sql
  JOIN dx_snapshot_teams
    ON dx_snapshot_teams.id = dx_snapshot_team_scores.snapshot_team_id
  ```
- **dx_snapshot_allocation_scores**
  ```sql
  JOIN dx_snapshot_teams
    ON dx_snapshot_teams.id = dx_snapshot_allocation_scores.snapshot_team_id
  ```

### Bridges — join through, never to

- **dx_snapshot_team_hierarchies**
  ```sql
  JOIN dx_snapshot_teams
    ON dx_snapshot_teams.id = dx_snapshot_team_hierarchies.ancestor_id
  ```
- **dx_snapshot_team_hierarchies**
  ```sql
  JOIN dx_snapshot_teams
    ON dx_snapshot_teams.id = dx_snapshot_team_hierarchies.descendant_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_snapshots

History of DX Snapshots.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_accounts**
  ```sql
  JOIN dx_accounts
    ON dx_accounts.id = dx_snapshots.account_id
  ```

### Joined from — these point here, one-to-many

- **dx_snapshot_items**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_items.snapshot_id
  ```
- **dx_snapshot_teams**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_teams.snapshot_id
  ```
- **dx_snapshot_team_scores**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_team_scores.snapshot_id
  ```
- **dx_snapshot_allocation_questions**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_allocation_questions.snapshot_id
  ```
- **dx_snapshot_allocation_items**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_allocation_items.snapshot_id
  ```
- **dx_snapshot_allocation_scores**
  ```sql
  JOIN dx_snapshots
    ON dx_snapshots.id = dx_snapshot_allocation_scores.snapshot_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_studies

DX Studies.

`source` · `lookup` · DX

### Joined from — these point here, one-to-many

- **dx_study_questions**
  ```sql
  JOIN dx_studies
    ON dx_studies.source_id = dx_study_questions.study_id
  ```
- **dx_study_responses**
  ```sql
  JOIN dx_studies
    ON dx_studies.source_id = dx_study_responses.study_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_study_question_options

DX Study question options.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_study_questions**
  ```sql
  JOIN dx_study_questions
    ON dx_study_questions.study_id = dx_study_question_options.question_id
  ```

### Bridges — join through, never to

- **dx_study_response_answers**
  ```sql
  JOIN dx_study_question_options
    ON dx_study_question_options.question_id = dx_study_response_answers.option_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## dx_study_questions

DX Study questions.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_studies**
  ```sql
  JOIN dx_studies
    ON dx_studies.source_id = dx_study_questions.study_id
  ```

### Joined from — these point here, one-to-many

- **dx_study_question_options**
  ```sql
  JOIN dx_study_questions
    ON dx_study_questions.study_id = dx_study_question_options.question_id
  ```

### Bridges — join through, never to

- **dx_study_response_answers**
  ```sql
  JOIN dx_study_questions
    ON dx_study_questions.study_id = dx_study_response_answers.question_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## dx_study_response_answers

DX Study response answers.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_study_responses**
  ```sql
  JOIN dx_study_responses
    ON dx_study_responses.source_id = dx_study_response_answers.response_id
  ```
- **dx_study_questions**
  ```sql
  JOIN dx_study_questions
    ON dx_study_questions.study_id = dx_study_response_answers.question_id
  ```
- **dx_study_question_options**
  ```sql
  JOIN dx_study_question_options
    ON dx_study_question_options.question_id = dx_study_response_answers.option_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_study_responses

DX Study responses.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_studies**
  ```sql
  JOIN dx_studies
    ON dx_studies.source_id = dx_study_responses.study_id
  ```
- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_study_responses.user_id
  ```

### Bridges — join through, never to

- **dx_study_response_answers**
  ```sql
  JOIN dx_study_responses
    ON dx_study_responses.source_id = dx_study_response_answers.response_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_tag_groups

A grouping of custom attributes which can be assigned to a user.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_accounts**
  ```sql
  JOIN dx_accounts
    ON dx_accounts.id = dx_tag_groups.account_id
  ```

### Joined from — these point here, one-to-many

- **dx_tags**
  ```sql
  JOIN dx_tag_groups
    ON dx_tag_groups.id = dx_tags.tag_group_id
  ```

### Bridges — join through, never to

- **dx_user_tags**
  ```sql
  JOIN dx_tag_groups
    ON dx_tag_groups.id = dx_user_tags.tag_group_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_tags

Custom attributes which can be assigned to a user.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_accounts**
  ```sql
  JOIN dx_accounts
    ON dx_accounts.id = dx_tags.account_id
  ```
- **dx_tag_groups**
  ```sql
  JOIN dx_tag_groups
    ON dx_tag_groups.id = dx_tags.tag_group_id
  ```

### Bridges — join through, never to

- **dx_user_tags**
  ```sql
  JOIN dx_tags
    ON dx_tags.id = dx_user_tags.tag_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_team_hierarchies

The current hierarchy of DX teams. Data is modeled in a tree structure.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_team_hierarchies.ancestor_id
  ```
- **dx_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_team_hierarchies.descendant_id
  ```

### Caveats

- **Joins dx_teams 2 different ways** — ancestor_id, descendant_id. These are separate columns that frequently hold different values, so joining dx_teams once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_team_hierarchy_levels

Levels in the DX team hierarchy.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_accounts** — confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN dx_accounts
    ON dx_accounts.id = dx_team_hierarchy_levels.account_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## dx_teams

Current DX team structure.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_teams.source_manager_id
  ```

### Joined from — these point here, one-to-many

- **dx_snapshot_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_snapshot_teams.team_id
  ```
- **dx_snapshot_team_scores**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_snapshot_team_scores.team_id
  ```
- **dx_snapshot_allocation_scores**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_snapshot_allocation_scores.team_id
  ```
- **dx_users**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_users.team_id
  ```
- **dx_versioned_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_versioned_teams.team_id
  ```

### Bridges — join through, never to

- **dx_catalog_entity_owners**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_catalog_entity_owners.team_id
  ```
- **dx_team_hierarchies**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_team_hierarchies.ancestor_id
  ```
- **dx_team_hierarchies**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_team_hierarchies.descendant_id
  ```

### Self-join

- **dx_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_teams.source_parent_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_user_identifiers

Normalized emails and source-control usernames associated with DX users.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_user_identifiers.user_id
  ```

## dx_user_tags

Custom attributes assignment to DX users.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_user_tags.user_id
  ```
- **dx_tags**
  ```sql
  JOIN dx_tags
    ON dx_tags.id = dx_user_tags.tag_id
  ```
- **dx_tag_groups**
  ```sql
  JOIN dx_tag_groups
    ON dx_tag_groups.id = dx_user_tags.tag_group_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_users

DX User information.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_users.team_id
  ```

### Joined from — these point here, one-to-many

- **ai_code_commit_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = ai_code_commit_users.dx_user_id
  ```
- **ai_tool_daily_metrics**
  ```sql
  JOIN dx_users
    ON dx_users.id = ai_tool_daily_metrics.dx_user_id
  ```
- **dx_teams**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_teams.source_manager_id
  ```
- **dx_platform_projects**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_platform_projects.creator_user_id
  ```
- **dx_platform_events**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_platform_events.user_id
  ```
- **dx_user_identifiers**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_user_identifiers.user_id
  ```
- **dx_onboarding_hires**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_onboarding_hires.user_id
  ```
- **dx_onboarding_hires**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_onboarding_hires.sender_id
  ```
- **dx_platform_responses**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_platform_responses.user_id
  ```
- **dx_study_responses**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_study_responses.user_id
  ```
- **dx_groups**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_groups.owner_id
  ```
- **google_calendar_events**
  ```sql
  JOIN dx_users
    ON dx_users.id = google_calendar_events.dx_user_id
  ```
- **google_calendar_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = google_calendar_users.dx_user_id
  ```
- **outlook_calendar_events**
  ```sql
  JOIN dx_users
    ON dx_users.id = outlook_calendar_events.dx_user_id
  ```
- **pipeline_runs**
  ```sql
  JOIN dx_users
    ON dx_users.id = pipeline_runs.dx_user_id
  ```
- **identities**
  ```sql
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
  ```
- **user_link_decisions**
  ```sql
  JOIN dx_users
    ON dx_users.id = user_link_decisions.dx_user_id
  ```
- **issues**
  ```sql
  JOIN dx_users
    ON dx_users.id = issues.dx_user_id
  ```
- **issues**
  ```sql
  JOIN dx_users
    ON dx_users.id = issues.creator_id
  ```
- **pull_requests**
  ```sql
  JOIN dx_users
    ON dx_users.id = pull_requests.dx_user_id
  ```
- **pull_requests**
  ```sql
  JOIN dx_users
    ON dx_users.id = pull_requests.merged_by_user_id
  ```
- **pull_request_reviews**
  ```sql
  JOIN dx_users
    ON dx_users.id = pull_request_reviews.dx_user_id
  ```
- **pull_request_commits**
  ```sql
  JOIN dx_users
    ON dx_users.id = pull_request_commits.dx_user_id
  ```
- **bespoke_ai_tool_daily_metrics** — user · crosses vendors · case-insensitive match · confidence: medium
  Bespoke metrics arrive with an email and no dx_user_id, so attributing them to a person means matching on email where every other AI table has a resolved foreign key.
  ```sql
  JOIN dx_users
    ON lower(dx_users.email) = lower(bespoke_ai_tool_daily_metrics.email)
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **dx_catalog_entity_owners**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_catalog_entity_owners.user_id
  ```
- **dx_user_tags**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_user_tags.user_id
  ```
- **dx_versioned_team_members**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_versioned_team_members.user_id
  ```
- **dx_group_memberships**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_group_memberships.dx_user_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_versioned_team_dates

Dates for versioned teams.

`source` · `lookup` · DX

### Joined from — these point here, one-to-many

- **dx_versioned_teams**
  ```sql
  JOIN dx_versioned_team_dates
    ON dx_versioned_team_dates.source_id = dx_versioned_teams.versioned_team_date_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## dx_versioned_team_hierarchies

Hierarchical relationships between versioned teams.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_versioned_teams**
  ```sql
  JOIN dx_versioned_teams
    ON dx_versioned_teams.source_id = dx_versioned_team_hierarchies.ancestor_id
  ```
- **dx_versioned_teams**
  ```sql
  JOIN dx_versioned_teams
    ON dx_versioned_teams.source_id = dx_versioned_team_hierarchies.descendant_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Joins dx_versioned_teams 2 different ways** — ancestor_id, descendant_id. These are separate columns that frequently hold different values, so joining dx_versioned_teams once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_versioned_team_members

Members of teams at specific points in time.

`source` · `bridge` · DX

### Joins out — this table holds the key

- **dx_versioned_teams**
  ```sql
  JOIN dx_versioned_teams
    ON dx_versioned_teams.source_id = dx_versioned_team_members.versioned_team_id
  ```
- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = dx_versioned_team_members.user_id
  ```

### Joined from — these point here, one-to-many

- **pull_requests**
  ```sql
  JOIN dx_versioned_team_members
    ON dx_versioned_team_members.source_id = pull_requests.dx_versioned_team_member_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## dx_versioned_teams

Teams at specific points in time.

`source` · `entity` · DX

### Joins out — this table holds the key

- **dx_versioned_team_dates**
  ```sql
  JOIN dx_versioned_team_dates
    ON dx_versioned_team_dates.source_id = dx_versioned_teams.versioned_team_date_id
  ```
- **dx_teams**
  ```sql
  JOIN dx_teams
    ON dx_teams.id = dx_versioned_teams.team_id
  ```

### Bridges — join through, never to

- **dx_versioned_team_members**
  ```sql
  JOIN dx_versioned_teams
    ON dx_versioned_teams.source_id = dx_versioned_team_members.versioned_team_id
  ```
- **dx_versioned_team_hierarchies**
  ```sql
  JOIN dx_versioned_teams
    ON dx_versioned_teams.source_id = dx_versioned_team_hierarchies.ancestor_id
  ```
- **dx_versioned_team_hierarchies**
  ```sql
  JOIN dx_versioned_teams
    ON dx_versioned_teams.source_id = dx_versioned_team_hierarchies.descendant_id
  ```

### Self-join

- **dx_versioned_teams**
  ```sql
  JOIN dx_versioned_teams
    ON dx_versioned_teams.source_id = dx_versioned_teams.parent_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## repo_groups

Groups of repositories, used for filtering purposes in the dashboard.

`source` · `lookup` · DX

### Joined from — these point here, one-to-many

- **repos**
  ```sql
  JOIN repo_groups
    ON repo_groups.id = repos.repo_group_id
  ```
