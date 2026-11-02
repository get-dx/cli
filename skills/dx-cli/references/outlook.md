# Outlook Calendar tables

1 tables. Every join below is stated with the SQL to write.

## outlook_calendar_events

Events from Outlook Calendar.

`source` · `entity` · Outlook Calendar

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = outlook_calendar_events.dx_user_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
