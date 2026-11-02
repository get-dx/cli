# JSM Cloud Incident tables

11 tables. Every join below is stated with the SQL to write.

## jsm_custom_fields

Details of the JSM custom fields.

`source` · `lookup` · JSM Cloud Incident

### Joined from — these point here, one-to-many

- **jsm_incident_custom_field_values**
  ```sql
  JOIN jsm_custom_fields
    ON jsm_custom_fields.source_id = jsm_incident_custom_field_values.custom_field_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the JSM Cloud Incident id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jsm_incident_custom_field_values

Details of the custom field values for incidents.

`source` · `entity` · JSM Cloud Incident

### Joins out — this table holds the key

- **jsm_custom_fields**
  ```sql
  JOIN jsm_custom_fields
    ON jsm_custom_fields.source_id = jsm_incident_custom_field_values.custom_field_id
  ```
- **jsm_incidents** — column not in the published schema · confidence: medium
  incident_id is an integer, but jsm_incidents publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN jsm_incidents
    ON jsm_incidents.id = jsm_incident_custom_field_values.incident_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## jsm_incident_labels

Details of the labels related to incidents.

`source` · `bridge` · JSM Cloud Incident

### Joins out — this table holds the key

- **jsm_incidents**
  ```sql
  JOIN jsm_incidents
    ON jsm_incidents.source_id = jsm_incident_labels.incident_id
  ```
- **jsm_labels**
  ```sql
  JOIN jsm_labels
    ON jsm_labels.name = jsm_incident_labels.label_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jsm_incident_organizations

Details of the organizations related to incidents.

`source` · `bridge` · JSM Cloud Incident

### Joins out — this table holds the key

- **jsm_incidents**
  ```sql
  JOIN jsm_incidents
    ON jsm_incidents.source_id = jsm_incident_organizations.incident_id
  ```
- **jsm_organizations**
  ```sql
  JOIN jsm_organizations
    ON jsm_organizations.source_id = jsm_incident_organizations.organization_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jsm_incident_services

Details of the services related to incidents.

`source` · `bridge` · JSM Cloud Incident

### Joins out — this table holds the key

- **jsm_incidents**
  ```sql
  JOIN jsm_incidents
    ON jsm_incidents.source_id = jsm_incident_services.incident_id
  ```
- **jsm_services**
  ```sql
  JOIN jsm_services
    ON jsm_services.source_id = jsm_incident_services.service_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## jsm_incidents

Details of the JSM incidents.

`source` · `entity` · JSM Cloud Incident

### Joins out — this table holds the key

- **jsm_users**
  ```sql
  JOIN jsm_users
    ON jsm_users.account_id = jsm_incidents.assignee_id
  ```
- **jsm_users**
  ```sql
  JOIN jsm_users
    ON jsm_users.account_id = jsm_incidents.creator_id
  ```
- **jsm_users**
  ```sql
  JOIN jsm_users
    ON jsm_users.account_id = jsm_incidents.reporter_id
  ```
- **jsm_projects**
  ```sql
  JOIN jsm_projects
    ON jsm_projects.source_id = jsm_incidents.project_id
  ```

### Joined from — these point here, one-to-many

- **jsm_incident_custom_field_values** — column not in the published schema · confidence: medium
  incident_id is an integer, but jsm_incidents publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN jsm_incidents
    ON jsm_incidents.id = jsm_incident_custom_field_values.incident_id
  ```

### Bridges — join through, never to

- **jsm_incident_services**
  ```sql
  JOIN jsm_incidents
    ON jsm_incidents.source_id = jsm_incident_services.incident_id
  ```
- **jsm_incident_organizations**
  ```sql
  JOIN jsm_incidents
    ON jsm_incidents.source_id = jsm_incident_organizations.incident_id
  ```
- **jsm_incident_labels**
  ```sql
  JOIN jsm_incidents
    ON jsm_incidents.source_id = jsm_incident_labels.incident_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins jsm_users 3 different ways** — assignee_id, creator_id, reporter_id. These are separate columns that frequently hold different values, so joining jsm_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## jsm_labels

Details of the JSM labels.

`source` · `lookup` · JSM Cloud Incident

### Bridges — join through, never to

- **jsm_incident_labels**
  ```sql
  JOIN jsm_labels
    ON jsm_labels.name = jsm_incident_labels.label_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## jsm_organizations

Details of the JSM organizations.

`source` · `lookup` · JSM Cloud Incident

### Bridges — join through, never to

- **jsm_incident_organizations**
  ```sql
  JOIN jsm_organizations
    ON jsm_organizations.source_id = jsm_incident_organizations.organization_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the JSM Cloud Incident id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jsm_projects

Details of the JSM projects.

`source` · `lookup` · JSM Cloud Incident

### Joined from — these point here, one-to-many

- **jsm_incidents**
  ```sql
  JOIN jsm_projects
    ON jsm_projects.source_id = jsm_incidents.project_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the JSM Cloud Incident id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jsm_services

Details of the JSM services.

`source` · `lookup` · JSM Cloud Incident

### Bridges — join through, never to

- **jsm_incident_services**
  ```sql
  JOIN jsm_services
    ON jsm_services.source_id = jsm_incident_services.service_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## jsm_users

Details of the JSM users.

`source` · `lookup` · JSM Cloud Incident

### Joined from — these point here, one-to-many

- **jsm_incidents**
  ```sql
  JOIN jsm_users
    ON jsm_users.account_id = jsm_incidents.assignee_id
  ```
- **jsm_incidents**
  ```sql
  JOIN jsm_users
    ON jsm_users.account_id = jsm_incidents.creator_id
  ```
- **jsm_incidents**
  ```sql
  JOIN jsm_users
    ON jsm_users.account_id = jsm_incidents.reporter_id
  ```
- **identities** — jsm identity · **requires `source = 'jira_service_management'`** · crosses vendors · confidence: high
  Confirmed against live data: every identity row with source = 'jira_service_management' matches a row in jsm_users.
  ```sql
  JOIN identities
    ON identities.source_id = jsm_users.id
   AND identities.source = 'jira_service_management'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
