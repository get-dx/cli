# Firehydrant tables

12 tables. Every join below is stated with the SQL to write.

## firehydrant_custom_field_values

Values of custom fields for incidents in Firehydrant.

`source` · `bridge` · Firehydrant

### Joins out — this table holds the key

- **firehydrant_incidents**
  ```sql
  JOIN firehydrant_incidents
    ON firehydrant_incidents.id = firehydrant_custom_field_values.incident_id
  ```
- **firehydrant_custom_fields**
  ```sql
  JOIN firehydrant_custom_fields
    ON firehydrant_custom_fields.id = firehydrant_custom_field_values.custom_field_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## firehydrant_custom_fields

Details of custom fields defined in Firehydrant.

`source` · `lookup` · Firehydrant

### Bridges — join through, never to

- **firehydrant_custom_field_values**
  ```sql
  JOIN firehydrant_custom_fields
    ON firehydrant_custom_fields.id = firehydrant_custom_field_values.custom_field_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## firehydrant_environments

Details of environments in Firehydrant.

`source` · `lookup` · Firehydrant

### Bridges — join through, never to

- **firehydrant_incident_environments**
  ```sql
  JOIN firehydrant_environments
    ON firehydrant_environments.id = firehydrant_incident_environments.environment_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## firehydrant_incident_environments

Details of environments impacted by incidents in Firehydrant.

`source` · `bridge` · Firehydrant

### Joins out — this table holds the key

- **firehydrant_environments**
  ```sql
  JOIN firehydrant_environments
    ON firehydrant_environments.id = firehydrant_incident_environments.environment_id
  ```
- **firehydrant_incidents**
  ```sql
  JOIN firehydrant_incidents
    ON firehydrant_incidents.id = firehydrant_incident_environments.incident_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## firehydrant_incident_responders

Details of responders to incidents in Firehydrant.

`source` · `bridge` · Firehydrant

### Joins out — this table holds the key

- **firehydrant_incidents**
  ```sql
  JOIN firehydrant_incidents
    ON firehydrant_incidents.id = firehydrant_incident_responders.incident_id
  ```
- **firehydrant_users**
  ```sql
  JOIN firehydrant_users
    ON firehydrant_users.id = firehydrant_incident_responders.responder_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## firehydrant_incident_services

Details of services impacted by incidents in Firehydrant.

`source` · `bridge` · Firehydrant

### Joins out — this table holds the key

- **firehydrant_incidents**
  ```sql
  JOIN firehydrant_incidents
    ON firehydrant_incidents.id = firehydrant_incident_services.incident_id
  ```
- **firehydrant_services**
  ```sql
  JOIN firehydrant_services
    ON firehydrant_services.id = firehydrant_incident_services.service_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## firehydrant_incidents

Details of incidents in Firehydrant.

`source` · `lookup` · Firehydrant

### Bridges — join through, never to

- **firehydrant_incident_responders**
  ```sql
  JOIN firehydrant_incidents
    ON firehydrant_incidents.id = firehydrant_incident_responders.incident_id
  ```
- **firehydrant_incident_services**
  ```sql
  JOIN firehydrant_incidents
    ON firehydrant_incidents.id = firehydrant_incident_services.incident_id
  ```
- **firehydrant_custom_field_values**
  ```sql
  JOIN firehydrant_incidents
    ON firehydrant_incidents.id = firehydrant_custom_field_values.incident_id
  ```
- **firehydrant_incident_environments**
  ```sql
  JOIN firehydrant_incidents
    ON firehydrant_incidents.id = firehydrant_incident_environments.incident_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Firehydrant id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## firehydrant_service_teams

Details of service-team relationships in Firehydrant.

`source` · `bridge` · Firehydrant

### Joins out — this table holds the key

- **firehydrant_teams**
  ```sql
  JOIN firehydrant_teams
    ON firehydrant_teams.id = firehydrant_service_teams.team_id
  ```
- **firehydrant_services**
  ```sql
  JOIN firehydrant_services
    ON firehydrant_services.id = firehydrant_service_teams.service_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## firehydrant_services

Details of Firehydrant services.

`source` · `lookup` · Firehydrant

### Bridges — join through, never to

- **firehydrant_incident_services**
  ```sql
  JOIN firehydrant_services
    ON firehydrant_services.id = firehydrant_incident_services.service_id
  ```
- **firehydrant_service_teams**
  ```sql
  JOIN firehydrant_services
    ON firehydrant_services.id = firehydrant_service_teams.service_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## firehydrant_teams

Details of Firehydrant teams.

`source` · `lookup` · Firehydrant

### Bridges — join through, never to

- **firehydrant_user_teams**
  ```sql
  JOIN firehydrant_teams
    ON firehydrant_teams.id = firehydrant_user_teams.team_id
  ```
- **firehydrant_service_teams**
  ```sql
  JOIN firehydrant_teams
    ON firehydrant_teams.id = firehydrant_service_teams.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## firehydrant_user_teams

Details of the association between users and teams in Firehydrant.

`source` · `bridge` · Firehydrant

### Joins out — this table holds the key

- **firehydrant_users**
  ```sql
  JOIN firehydrant_users
    ON firehydrant_users.id = firehydrant_user_teams.user_id
  ```
- **firehydrant_teams**
  ```sql
  JOIN firehydrant_teams
    ON firehydrant_teams.id = firehydrant_user_teams.team_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## firehydrant_users

Details of Firehydrant users.

`source` · `lookup` · Firehydrant

### Joined from — these point here, one-to-many

- **identities** — firehydrant identity · **requires `source = 'firehydrant' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  firehydrant_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = firehydrant_users.id
   AND identities.source = 'firehydrant'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **firehydrant_user_teams**
  ```sql
  JOIN firehydrant_users
    ON firehydrant_users.id = firehydrant_user_teams.user_id
  ```
- **firehydrant_incident_responders**
  ```sql
  JOIN firehydrant_users
    ON firehydrant_users.id = firehydrant_incident_responders.responder_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
