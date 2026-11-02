# Rootly tables

17 tables. Every join below is stated with the SQL to write.

## rootly_alert_teams

Details of the association between alerts and teams in Rootly.

`source` · `bridge` · Rootly

### Joins out — this table holds the key

- **rootly_alerts**
  ```sql
  JOIN rootly_alerts
    ON rootly_alerts.id = rootly_alert_teams.alert_id
  ```
- **rootly_teams**
  ```sql
  JOIN rootly_teams
    ON rootly_teams.id = rootly_alert_teams.team_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## rootly_alert_urgencies

Details of alert urgency levels in Rootly.

`source` · `lookup` · Rootly

### Joined from — these point here, one-to-many

- **rootly_alerts**
  ```sql
  JOIN rootly_alert_urgencies
    ON rootly_alert_urgencies.id = rootly_alerts.alert_urgency_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## rootly_alerts

Details of Rootly alerts.

`source` · `entity` · Rootly

### Joins out — this table holds the key

- **rootly_alert_urgencies**
  ```sql
  JOIN rootly_alert_urgencies
    ON rootly_alert_urgencies.id = rootly_alerts.alert_urgency_id
  ```

### Bridges — join through, never to

- **rootly_incident_alerts**
  ```sql
  JOIN rootly_alerts
    ON rootly_alerts.id = rootly_incident_alerts.alert_id
  ```
- **rootly_alert_teams**
  ```sql
  JOIN rootly_alerts
    ON rootly_alerts.id = rootly_alert_teams.alert_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## rootly_causes

Details of Rootly causes.

`source` · `lookup` · Rootly

### Bridges — join through, never to

- **rootly_incident_causes**
  ```sql
  JOIN rootly_causes
    ON rootly_causes.id = rootly_incident_causes.cause_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## rootly_custom_field_values

Details of custom field values linked to incidents.

`source` · `bridge` · Rootly

### Joins out — this table holds the key

- **rootly_incidents**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_custom_field_values.incident_id
  ```
- **rootly_custom_fields**
  ```sql
  JOIN rootly_custom_fields
    ON rootly_custom_fields.id = rootly_custom_field_values.custom_field_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## rootly_custom_fields

Details of Rootly custom fields.

`source` · `lookup` · Rootly

### Bridges — join through, never to

- **rootly_custom_field_values**
  ```sql
  JOIN rootly_custom_fields
    ON rootly_custom_fields.id = rootly_custom_field_values.custom_field_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## rootly_incident_alerts

Details of the association between incidents and alerts in Rootly.

`source` · `bridge` · Rootly

### Joins out — this table holds the key

- **rootly_incidents**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_incident_alerts.incident_id
  ```
- **rootly_alerts**
  ```sql
  JOIN rootly_alerts
    ON rootly_alerts.id = rootly_incident_alerts.alert_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## rootly_incident_causes

Details of the association between incidents and causes in Rootly.

`source` · `bridge` · Rootly

### Joins out — this table holds the key

- **rootly_incidents**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_incident_causes.incident_id
  ```
- **rootly_causes**
  ```sql
  JOIN rootly_causes
    ON rootly_causes.id = rootly_incident_causes.cause_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## rootly_incident_incident_types

Details of the association between incidents and incident types in Rootly.

`source` · `bridge` · Rootly

### Joins out — this table holds the key

- **rootly_incidents**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_incident_incident_types.incident_id
  ```
- **rootly_incident_types**
  ```sql
  JOIN rootly_incident_types
    ON rootly_incident_types.id = rootly_incident_incident_types.incident_type_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## rootly_incident_services

Details of the association between incidents and services in Rootly.

`source` · `bridge` · Rootly

### Joins out — this table holds the key

- **rootly_incidents**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_incident_services.incident_id
  ```
- **rootly_services**
  ```sql
  JOIN rootly_services
    ON rootly_services.id = rootly_incident_services.service_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## rootly_incident_teams

Details of the association between incidents and teams in Rootly.

`source` · `bridge` · Rootly

### Joins out — this table holds the key

- **rootly_incidents**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_incident_teams.incident_id
  ```
- **rootly_teams**
  ```sql
  JOIN rootly_teams
    ON rootly_teams.id = rootly_incident_teams.team_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## rootly_incident_types

Details of Rootly incident types.

`source` · `lookup` · Rootly

### Bridges — join through, never to

- **rootly_incident_incident_types**
  ```sql
  JOIN rootly_incident_types
    ON rootly_incident_types.id = rootly_incident_incident_types.incident_type_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## rootly_incidents

Details of Rootly incidents.

`source` · `lookup` · Rootly

### Bridges — join through, never to

- **rootly_incident_services**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_incident_services.incident_id
  ```
- **rootly_incident_teams**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_incident_teams.incident_id
  ```
- **rootly_incident_alerts**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_incident_alerts.incident_id
  ```
- **rootly_incident_causes**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_incident_causes.incident_id
  ```
- **rootly_incident_incident_types**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_incident_incident_types.incident_id
  ```
- **rootly_custom_field_values**
  ```sql
  JOIN rootly_incidents
    ON rootly_incidents.id = rootly_custom_field_values.incident_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Rootly id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## rootly_services

Details of Rootly services.

`source` · `lookup` · Rootly

### Bridges — join through, never to

- **rootly_incident_services**
  ```sql
  JOIN rootly_services
    ON rootly_services.id = rootly_incident_services.service_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## rootly_teams

Details of Rootly teams.

`source` · `lookup` · Rootly

### Bridges — join through, never to

- **rootly_user_teams**
  ```sql
  JOIN rootly_teams
    ON rootly_teams.id = rootly_user_teams.team_id
  ```
- **rootly_incident_teams**
  ```sql
  JOIN rootly_teams
    ON rootly_teams.id = rootly_incident_teams.team_id
  ```
- **rootly_alert_teams**
  ```sql
  JOIN rootly_teams
    ON rootly_teams.id = rootly_alert_teams.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## rootly_user_teams

Details of the association between users and teams in Rootly.

`source` · `bridge` · Rootly

### Joins out — this table holds the key

- **rootly_users**
  ```sql
  JOIN rootly_users
    ON rootly_users.id = rootly_user_teams.user_id
  ```
- **rootly_teams**
  ```sql
  JOIN rootly_teams
    ON rootly_teams.id = rootly_user_teams.team_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## rootly_users

Details of Rootly users.

`source` · `lookup` · Rootly

### Joined from — these point here, one-to-many

- **identities** — rootly identity · **requires `source = 'rootly' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  rootly_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = rootly_users.id
   AND identities.source = 'rootly'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **rootly_user_teams**
  ```sql
  JOIN rootly_users
    ON rootly_users.id = rootly_user_teams.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
