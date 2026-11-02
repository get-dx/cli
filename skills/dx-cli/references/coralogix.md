# Coralogix tables

2 tables. Every join below is stated with the SQL to write.

## coralogix_slo_values

Time series values for SLO metrics from Coralogix queries.

`source` · `entity` · Coralogix

### Joins out — this table holds the key

- **coralogix_slos** — column not in the published schema · confidence: medium
  slo_id is an integer, but coralogix_slos publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN coralogix_slos
    ON coralogix_slos.id = coralogix_slo_values.slo_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## coralogix_slos

Service Level Objectives from Coralogix.

`source` · `entity` · Coralogix

### Joined from — these point here, one-to-many

- **coralogix_slo_values** — column not in the published schema · confidence: medium
  slo_id is an integer, but coralogix_slos publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN coralogix_slos
    ON coralogix_slos.id = coralogix_slo_values.slo_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.
