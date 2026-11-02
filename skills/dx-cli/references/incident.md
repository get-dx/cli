# IncidentIO tables

14 tables. Every join below is stated with the SQL to write.

## incident_io_custom_fields

Details of custom fields in Incident.io.

`source` · `lookup` · IncidentIO

### Bridges — join through, never to

- **incident_io_incident_custom_field_values**
  ```sql
  JOIN incident_io_custom_fields
    ON incident_io_custom_fields.id = incident_io_incident_custom_field_values.custom_field_id
  ```

## incident_io_incident_custom_field_values

Details of custom field values associated with incidents in Incident.io.

`source` · `bridge` · IncidentIO

### Joins out — this table holds the key

- **incident_io_incidents**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_custom_field_values.incident_id
  ```
- **incident_io_custom_fields**
  ```sql
  JOIN incident_io_custom_fields
    ON incident_io_custom_fields.id = incident_io_incident_custom_field_values.custom_field_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## incident_io_incident_follow_ups

Details of Incident follow ups.

`source` · `entity` · IncidentIO

### Joins out — this table holds the key

- **incident_io_incidents**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_follow_ups.incident_id
  ```
- **incident_io_users**
  ```sql
  JOIN incident_io_users
    ON incident_io_users.id = incident_io_incident_follow_ups.assignee_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## incident_io_incident_responders

Details of responders to incidents in Incident.io.

`source` · `entity` · IncidentIO

### Joins out — this table holds the key

- **incident_io_incidents**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_responders.incident_id
  ```

## incident_io_incident_role_assignments

Mapping between incidents and roles in Incident.io.

`source` · `bridge` · IncidentIO

### Joins out — this table holds the key

- **incident_io_incidents**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_role_assignments.incident_id
  ```
- **incident_io_incident_roles**
  ```sql
  JOIN incident_io_incident_roles
    ON incident_io_incident_roles.id = incident_io_incident_role_assignments.incident_role_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## incident_io_incident_roles

Details of roles associated with incidents in Incident.io.

`source` · `lookup` · IncidentIO

### Bridges — join through, never to

- **incident_io_incident_role_assignments**
  ```sql
  JOIN incident_io_incident_roles
    ON incident_io_incident_roles.id = incident_io_incident_role_assignments.incident_role_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## incident_io_incident_services

Mapping between incidents and services in Incident.io.

`source` · `bridge` · IncidentIO

### Joins out — this table holds the key

- **incident_io_incidents**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_services.incident_id
  ```
- **incident_io_services**
  ```sql
  JOIN incident_io_services
    ON incident_io_services.id = incident_io_incident_services.service_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## incident_io_incident_timestamp_values

Values for timestamps associated with incidents in Incident.io.

`source` · `bridge` · IncidentIO

### Joins out — this table holds the key

- **incident_io_incidents**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_timestamp_values.incident_id
  ```
- **incident_io_incident_timestamps**
  ```sql
  JOIN incident_io_incident_timestamps
    ON incident_io_incident_timestamps.id = incident_io_incident_timestamp_values.incident_timestamp_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## incident_io_incident_timestamps

Details of timestamps related to incidents in Incident.io.

`source` · `lookup` · IncidentIO

### Bridges — join through, never to

- **incident_io_incident_timestamp_values**
  ```sql
  JOIN incident_io_incident_timestamps
    ON incident_io_incident_timestamps.id = incident_io_incident_timestamp_values.incident_timestamp_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## incident_io_incident_types

Details of incident types in Incident.io.

`source` · `entity` · IncidentIO

No documented relationships.

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **No documented relationships** — Nothing in the schema points at this table and it points at nothing, so there is no verified way to join it. Treat any link you infer from column names as a guess until you have checked it against the data.

## incident_io_incidents

Details of incidents in Incident.io.

`source` · `lookup` · IncidentIO

### Joined from — these point here, one-to-many

- **incident_io_incident_responders**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_responders.incident_id
  ```
- **incident_io_incident_follow_ups**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_follow_ups.incident_id
  ```

### Bridges — join through, never to

- **incident_io_incident_custom_field_values**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_custom_field_values.incident_id
  ```
- **incident_io_incident_services**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_services.incident_id
  ```
- **incident_io_incident_timestamp_values**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_timestamp_values.incident_id
  ```
- **incident_io_incident_role_assignments**
  ```sql
  JOIN incident_io_incidents
    ON incident_io_incidents.id = incident_io_incident_role_assignments.incident_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the IncidentIO id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## incident_io_on_call_users

Details of on-call schedules in Incident.io.

`source` · `entity` · IncidentIO

### Joined from — these point here, one-to-many

- **identities** — incident_io_on_call identity · **requires `source = 'incident_io_on_call' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  incident_io_on_call_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = incident_io_on_call_users.id
   AND identities.source = 'incident_io_on_call'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **No documented relationships** — Nothing in the schema points at this table and it points at nothing, so there is no verified way to join it. Treat any link you infer from column names as a guess until you have checked it against the data.

## incident_io_services

Details of services in Incident.io.

`source` · `lookup` · IncidentIO

### Bridges — join through, never to

- **incident_io_incident_services**
  ```sql
  JOIN incident_io_services
    ON incident_io_services.id = incident_io_incident_services.service_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## incident_io_users

Details of Incident.io users.

`source` · `lookup` · IncidentIO

### Joined from — these point here, one-to-many

- **incident_io_incident_follow_ups**
  ```sql
  JOIN incident_io_users
    ON incident_io_users.id = incident_io_incident_follow_ups.assignee_id
  ```
- **identities** — incident_io identity · **requires `source = 'incident_io' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  incident_io_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = incident_io_users.id
   AND identities.source = 'incident_io'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
