# ServiceNow Incident Management tables

5 tables. Every join below is stated with the SQL to write.

## servicenow_groups

Details about ServiceNow groups.

`source` · `lookup` · ServiceNow Incident Management

### Joined from — these point here, one-to-many

- **servicenow_incidents** — **also match `connection_id`**
  ```sql
  JOIN servicenow_groups
    ON servicenow_groups.source_id = servicenow_incidents.assignment_group_id
   AND servicenow_incidents.connection_id = servicenow_groups.connection_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the ServiceNow Incident Management id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## servicenow_incident_custom_fields

Incident custom field values.

`source` · `entity` · ServiceNow Incident Management

### Joins out — this table holds the key

- **servicenow_incidents**
  ```sql
  JOIN servicenow_incidents
    ON servicenow_incidents.source_id = servicenow_incident_custom_fields.incident_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## servicenow_incidents

Details about ServiceNow incidents.

`source` · `entity` · ServiceNow Incident Management

### Joins out — this table holds the key

- **servicenow_users** — **also match `connection_id`**
  ```sql
  JOIN servicenow_users
    ON servicenow_users.source_id = servicenow_incidents.opened_by_id
   AND servicenow_incidents.connection_id = servicenow_users.connection_id
  ```
- **servicenow_users** — **also match `connection_id`**
  ```sql
  JOIN servicenow_users
    ON servicenow_users.source_id = servicenow_incidents.closed_by_id
   AND servicenow_incidents.connection_id = servicenow_users.connection_id
  ```
- **servicenow_users** — **also match `connection_id`**
  ```sql
  JOIN servicenow_users
    ON servicenow_users.source_id = servicenow_incidents.resolved_by_id
   AND servicenow_incidents.connection_id = servicenow_users.connection_id
  ```
- **servicenow_users** — **also match `connection_id`**
  ```sql
  JOIN servicenow_users
    ON servicenow_users.source_id = servicenow_incidents.caller_id
   AND servicenow_incidents.connection_id = servicenow_users.connection_id
  ```
- **servicenow_services** — **also match `connection_id`**
  ```sql
  JOIN servicenow_services
    ON servicenow_services.source_id = servicenow_incidents.service_id
   AND servicenow_incidents.connection_id = servicenow_services.connection_id
  ```
- **servicenow_users** — **also match `connection_id`**
  ```sql
  JOIN servicenow_users
    ON servicenow_users.source_id = servicenow_incidents.assigned_to_id
   AND servicenow_incidents.connection_id = servicenow_users.connection_id
  ```
- **servicenow_groups** — **also match `connection_id`**
  ```sql
  JOIN servicenow_groups
    ON servicenow_groups.source_id = servicenow_incidents.assignment_group_id
   AND servicenow_incidents.connection_id = servicenow_groups.connection_id
  ```

### Joined from — these point here, one-to-many

- **servicenow_incident_custom_fields**
  ```sql
  JOIN servicenow_incidents
    ON servicenow_incidents.source_id = servicenow_incident_custom_fields.incident_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the ServiceNow Incident Management id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins servicenow_users 5 different ways** — opened_by_id, closed_by_id, resolved_by_id, caller_id, assigned_to_id. These are separate columns that frequently hold different values, so joining servicenow_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## servicenow_services

Details about ServiceNow services.

`source` · `lookup` · ServiceNow Incident Management

### Joined from — these point here, one-to-many

- **servicenow_incidents** — **also match `connection_id`**
  ```sql
  JOIN servicenow_services
    ON servicenow_services.source_id = servicenow_incidents.service_id
   AND servicenow_incidents.connection_id = servicenow_services.connection_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the ServiceNow Incident Management id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## servicenow_users

Details about ServiceNow users.

`source` · `lookup` · ServiceNow Incident Management

### Joined from — these point here, one-to-many

- **servicenow_incidents** — **also match `connection_id`**
  ```sql
  JOIN servicenow_users
    ON servicenow_users.source_id = servicenow_incidents.opened_by_id
   AND servicenow_incidents.connection_id = servicenow_users.connection_id
  ```
- **servicenow_incidents** — **also match `connection_id`**
  ```sql
  JOIN servicenow_users
    ON servicenow_users.source_id = servicenow_incidents.closed_by_id
   AND servicenow_incidents.connection_id = servicenow_users.connection_id
  ```
- **servicenow_incidents** — **also match `connection_id`**
  ```sql
  JOIN servicenow_users
    ON servicenow_users.source_id = servicenow_incidents.resolved_by_id
   AND servicenow_incidents.connection_id = servicenow_users.connection_id
  ```
- **servicenow_incidents** — **also match `connection_id`**
  ```sql
  JOIN servicenow_users
    ON servicenow_users.source_id = servicenow_incidents.caller_id
   AND servicenow_incidents.connection_id = servicenow_users.connection_id
  ```
- **servicenow_incidents** — **also match `connection_id`**
  ```sql
  JOIN servicenow_users
    ON servicenow_users.source_id = servicenow_incidents.assigned_to_id
   AND servicenow_incidents.connection_id = servicenow_users.connection_id
  ```
- **identities** — servicenow identity · **requires `source = 'servicenow'`** · crosses vendors · confidence: high
  Confirmed against live data: every identity row with source = 'servicenow' matches a row in servicenow_users.
  ```sql
  JOIN identities
    ON identities.source_id = servicenow_users.id
   AND identities.source = 'servicenow'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the ServiceNow Incident Management id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
