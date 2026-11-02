# Datadog Incident Management tables

12 tables. Every join below is stated with the SQL to write.

## datadog_custom_field_values

Details of custom field values linked to incidents.

`source` · `bridge` · Datadog Incident Management

### Joins out — this table holds the key

- **datadog_incidents**
  ```sql
  JOIN datadog_incidents
    ON datadog_incidents.id = datadog_custom_field_values.incident_id
  ```
- **datadog_custom_fields**
  ```sql
  JOIN datadog_custom_fields
    ON datadog_custom_fields.id = datadog_custom_field_values.custom_field_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## datadog_custom_fields

Details of Datadog custom fields.

`source` · `lookup` · Datadog Incident Management

### Bridges — join through, never to

- **datadog_custom_field_values**
  ```sql
  JOIN datadog_custom_fields
    ON datadog_custom_fields.id = datadog_custom_field_values.custom_field_id
  ```

## datadog_incident_services

Details of the association between incidents and services in Datadog.

`source` · `bridge` · Datadog Incident Management

### Joins out — this table holds the key

- **datadog_incidents**
  ```sql
  JOIN datadog_incidents
    ON datadog_incidents.id = datadog_incident_services.incident_id
  ```
- **datadog_services**
  ```sql
  JOIN datadog_services
    ON datadog_services.id = datadog_incident_services.service_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## datadog_incidents

Details of Datadog incidents.

`source` · `entity` · Datadog Incident Management

### Joins out — this table holds the key

- **datadog_users**
  ```sql
  JOIN datadog_users
    ON datadog_users.id = datadog_incidents.creator_user_id
  ```
- **datadog_users**
  ```sql
  JOIN datadog_users
    ON datadog_users.id = datadog_incidents.commander_user_id
  ```

### Bridges — join through, never to

- **datadog_incident_services**
  ```sql
  JOIN datadog_incidents
    ON datadog_incidents.id = datadog_incident_services.incident_id
  ```
- **datadog_custom_field_values**
  ```sql
  JOIN datadog_incidents
    ON datadog_incidents.id = datadog_custom_field_values.incident_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Datadog Incident Management id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins datadog_users 2 different ways** — creator_user_id, commander_user_id. These are separate columns that frequently hold different values, so joining datadog_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## datadog_monitors

Details of Datadog monitors.

`source` · `entity` · Datadog SLO

No documented relationships.

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **No documented relationships** — Nothing in the schema points at this table and it points at nothing, so there is no verified way to join it. Treat any link you infer from column names as a guess until you have checked it against the data.

## datadog_services

Details of Datadog services.

`source` · `lookup` · Datadog Incident Management

### Joins out — this table holds the key

- **datadog_teams** — confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN datadog_teams
    ON datadog_teams.id = datadog_services.team_id
  ```

### Bridges — join through, never to

- **datadog_incident_services**
  ```sql
  JOIN datadog_services
    ON datadog_services.id = datadog_incident_services.service_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Datadog Incident Management id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## datadog_slo_metrics

Historical SLI (Service Level Indicator) values for each SLO over time, captured for all SLO types (metric, monitor, and time_slice).

`source` · `entity` · Datadog SLO

### Joins out — this table holds the key

- **datadog_slos**
  ```sql
  JOIN datadog_slos
    ON datadog_slos.id = datadog_slo_metrics.slo_id
  ```

## datadog_slo_tags

Details of tags associated with SLOs.

`source` · `entity` · Datadog SLO

### Joins out — this table holds the key

- **datadog_slos**
  ```sql
  JOIN datadog_slos
    ON datadog_slos.id = datadog_slo_tags.slo_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## datadog_slos

Details of Datadog SLOs (Service Level Objectives).

`source` · `lookup` · Datadog SLO

### Joined from — these point here, one-to-many

- **datadog_slo_metrics**
  ```sql
  JOIN datadog_slos
    ON datadog_slos.id = datadog_slo_metrics.slo_id
  ```
- **datadog_slo_tags**
  ```sql
  JOIN datadog_slos
    ON datadog_slos.id = datadog_slo_tags.slo_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## datadog_teams

Details of Datadog teams.

`source` · `lookup` · Datadog Incident Management

### Joined from — these point here, one-to-many

- **datadog_services** — confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN datadog_teams
    ON datadog_teams.id = datadog_services.team_id
  ```

### Bridges — join through, never to

- **datadog_user_teams**
  ```sql
  JOIN datadog_teams
    ON datadog_teams.id = datadog_user_teams.team_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Datadog Incident Management id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## datadog_user_teams

Details of the association between users and teams in Datadog.

`source` · `bridge` · Datadog Incident Management

### Joins out — this table holds the key

- **datadog_users**
  ```sql
  JOIN datadog_users
    ON datadog_users.id = datadog_user_teams.user_id
  ```
- **datadog_teams**
  ```sql
  JOIN datadog_teams
    ON datadog_teams.id = datadog_user_teams.team_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## datadog_users

Details of Datadog users.

`source` · `lookup` · Datadog Incident Management

### Joined from — these point here, one-to-many

- **datadog_incidents**
  ```sql
  JOIN datadog_users
    ON datadog_users.id = datadog_incidents.creator_user_id
  ```
- **datadog_incidents**
  ```sql
  JOIN datadog_users
    ON datadog_users.id = datadog_incidents.commander_user_id
  ```
- **identities** — datadog identity · **requires `source = 'datadog' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  datadog_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = datadog_users.id
   AND identities.source = 'datadog'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **datadog_user_teams**
  ```sql
  JOIN datadog_users
    ON datadog_users.id = datadog_user_teams.user_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Datadog Incident Management id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
