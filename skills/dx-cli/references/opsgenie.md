# Opsgenie tables

8 tables. Every join below is stated with the SQL to write.

## opsgenie_alert_responders

Join table between Opsgenie alerts and responders. A responder can be a user or a team

`source` · `bridge` · Opsgenie

### Joins out — this table holds the key

- **opsgenie_alerts**
  ```sql
  JOIN opsgenie_alerts
    ON opsgenie_alerts.id = opsgenie_alert_responders.alert_id
  ```
- **opsgenie_users**
  ```sql
  JOIN opsgenie_users
    ON opsgenie_users.id = opsgenie_alert_responders.responder_id
  ```
- **opsgenie_teams**
  ```sql
  JOIN opsgenie_teams
    ON opsgenie_teams.id = opsgenie_alert_responders.responder_id
  ```

### Caveats

- **responder_id is polymorphic** — It points at 2 different tables (opsgenie_users, opsgenie_teams) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## opsgenie_alerts

Details about Opsgenie alerts.

`source` · `lookup` · Opsgenie

### Bridges — join through, never to

- **opsgenie_alert_responders**
  ```sql
  JOIN opsgenie_alerts
    ON opsgenie_alerts.id = opsgenie_alert_responders.alert_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## opsgenie_incident_responders

Join table between incidents and responders. A responder can be a user or a team

`source` · `bridge` · Opsgenie

### Joins out — this table holds the key

- **opsgenie_incidents**
  ```sql
  JOIN opsgenie_incidents
    ON opsgenie_incidents.id = opsgenie_incident_responders.incident_id
  ```
- **opsgenie_teams**
  ```sql
  JOIN opsgenie_teams
    ON opsgenie_teams.id = opsgenie_incident_responders.responder_id
  ```
- **opsgenie_users**
  ```sql
  JOIN opsgenie_users
    ON opsgenie_users.id = opsgenie_incident_responders.responder_id
  ```

### Caveats

- **responder_id is polymorphic** — It points at 2 different tables (opsgenie_teams, opsgenie_users) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## opsgenie_incidents

Details of Opsgenie incidents

`source` · `lookup` · Opsgenie

### Bridges — join through, never to

- **opsgenie_incident_responders**
  ```sql
  JOIN opsgenie_incidents
    ON opsgenie_incidents.id = opsgenie_incident_responders.incident_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Opsgenie id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## opsgenie_services

Details of Opsgenie services

`source` · `entity` · Opsgenie

### Joins out — this table holds the key

- **opsgenie_teams**
  ```sql
  JOIN opsgenie_teams
    ON opsgenie_teams.id = opsgenie_services.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## opsgenie_teams

Details of Opsgenie teams

`source` · `lookup` · Opsgenie

### Joined from — these point here, one-to-many

- **opsgenie_services**
  ```sql
  JOIN opsgenie_teams
    ON opsgenie_teams.id = opsgenie_services.team_id
  ```

### Bridges — join through, never to

- **opsgenie_alert_responders**
  ```sql
  JOIN opsgenie_teams
    ON opsgenie_teams.id = opsgenie_alert_responders.responder_id
  ```
- **opsgenie_incident_responders**
  ```sql
  JOIN opsgenie_teams
    ON opsgenie_teams.id = opsgenie_incident_responders.responder_id
  ```
- **opsgenie_user_teams**
  ```sql
  JOIN opsgenie_teams
    ON opsgenie_teams.id = opsgenie_user_teams.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## opsgenie_user_teams

Join table between Opsgenie users and teams

`source` · `bridge` · Opsgenie

### Joins out — this table holds the key

- **opsgenie_users**
  ```sql
  JOIN opsgenie_users
    ON opsgenie_users.id = opsgenie_user_teams.user_id
  ```
- **opsgenie_teams**
  ```sql
  JOIN opsgenie_teams
    ON opsgenie_teams.id = opsgenie_user_teams.team_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## opsgenie_users

Details about Opsgenie users

`source` · `lookup` · Opsgenie

### Joined from — these point here, one-to-many

- **identities** — opsgenie identity · **requires `source = 'opsgenie' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  opsgenie_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = opsgenie_users.id
   AND identities.source = 'opsgenie'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **opsgenie_alert_responders**
  ```sql
  JOIN opsgenie_users
    ON opsgenie_users.id = opsgenie_alert_responders.responder_id
  ```
- **opsgenie_incident_responders**
  ```sql
  JOIN opsgenie_users
    ON opsgenie_users.id = opsgenie_incident_responders.responder_id
  ```
- **opsgenie_user_teams**
  ```sql
  JOIN opsgenie_users
    ON opsgenie_users.id = opsgenie_user_teams.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
