# PagerDuty tables

9 tables. Every join below is stated with the SQL to write.

## pagerduty_custom_fields

Details about PagerDuty custom fields

`source` · `lookup` · PagerDuty

### Bridges — join through, never to

- **pagerduty_incident_custom_field_values**
  ```sql
  JOIN pagerduty_custom_fields
    ON pagerduty_custom_fields.id = pagerduty_incident_custom_field_values.custom_field_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## pagerduty_incident_custom_field_values

Join table between incidents and custom field values

`source` · `bridge` · PagerDuty

### Joins out — this table holds the key

- **pagerduty_incidents**
  ```sql
  JOIN pagerduty_incidents
    ON pagerduty_incidents.id = pagerduty_incident_custom_field_values.incident_id
  ```
- **pagerduty_custom_fields**
  ```sql
  JOIN pagerduty_custom_fields
    ON pagerduty_custom_fields.id = pagerduty_incident_custom_field_values.custom_field_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## pagerduty_incident_teams

Join table between incidents and teams

`source` · `bridge` · PagerDuty

### Joins out — this table holds the key

- **pagerduty_incidents**
  ```sql
  JOIN pagerduty_incidents
    ON pagerduty_incidents.id = pagerduty_incident_teams.incident_id
  ```
- **pagerduty_teams**
  ```sql
  JOIN pagerduty_teams
    ON pagerduty_teams.id = pagerduty_incident_teams.team_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## pagerduty_incidents

Details about PagerDuty incidents

`source` · `entity` · PagerDuty

### Joins out — this table holds the key

- **pagerduty_services**
  ```sql
  JOIN pagerduty_services
    ON pagerduty_services.id = pagerduty_incidents.service_id
  ```

### Bridges — join through, never to

- **pagerduty_incident_teams**
  ```sql
  JOIN pagerduty_incidents
    ON pagerduty_incidents.id = pagerduty_incident_teams.incident_id
  ```
- **pagerduty_incident_custom_field_values**
  ```sql
  JOIN pagerduty_incidents
    ON pagerduty_incidents.id = pagerduty_incident_custom_field_values.incident_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the PagerDuty id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## pagerduty_on_call_users

Details about PagerDuty on-call users, derived from the oncalls API and linked to services via escalation policies

`source` · `entity` · PagerDuty

### Joins out — this table holds the key

- **pagerduty_users**
  ```sql
  JOIN pagerduty_users
    ON pagerduty_users.id = pagerduty_on_call_users.user_id
  ```

### Joined from — these point here, one-to-many

- **identities** — pagerduty_on_call identity · **requires `source = 'pagerduty_on_call' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  pagerduty_on_call_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = pagerduty_on_call_users.id
   AND identities.source = 'pagerduty_on_call'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

## pagerduty_services

Details about PagerDuty services

`source` · `lookup` · PagerDuty

### Joined from — these point here, one-to-many

- **pagerduty_incidents**
  ```sql
  JOIN pagerduty_services
    ON pagerduty_services.id = pagerduty_incidents.service_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## pagerduty_team_users

Join table between teams and users

`source` · `bridge` · PagerDuty

### Joins out — this table holds the key

- **pagerduty_teams**
  ```sql
  JOIN pagerduty_teams
    ON pagerduty_teams.id = pagerduty_team_users.team_id
  ```
- **pagerduty_users**
  ```sql
  JOIN pagerduty_users
    ON pagerduty_users.id = pagerduty_team_users.user_id
  ```

### Joined from — these point here, one-to-many

- **identities** — pagerduty_team identity · **requires `source = 'pagerduty_team' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  pagerduty_team_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = pagerduty_team_users.id
   AND identities.source = 'pagerduty_team'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## pagerduty_teams

Details about PagerDuty teams

`source` · `lookup` · PagerDuty

### Bridges — join through, never to

- **pagerduty_incident_teams**
  ```sql
  JOIN pagerduty_teams
    ON pagerduty_teams.id = pagerduty_incident_teams.team_id
  ```
- **pagerduty_team_users**
  ```sql
  JOIN pagerduty_teams
    ON pagerduty_teams.id = pagerduty_team_users.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## pagerduty_users

Details about PagerDuty users

`source` · `lookup` · PagerDuty

### Joined from — these point here, one-to-many

- **pagerduty_on_call_users**
  ```sql
  JOIN pagerduty_users
    ON pagerduty_users.id = pagerduty_on_call_users.user_id
  ```
- **identities** — pagerduty identity · **requires `source = 'pagerduty' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  pagerduty_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = pagerduty_users.id
   AND identities.source = 'pagerduty'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **pagerduty_team_users**
  ```sql
  JOIN pagerduty_users
    ON pagerduty_users.id = pagerduty_team_users.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
