# Google Calendar tables

2 tables. Every join below is stated with the SQL to write.

## google_calendar_events

Events from Google Calendar.

`source` · `entity` · Google Calendar

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = google_calendar_events.dx_user_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## google_calendar_users

Tracks sync progress for Google Calendar events per DX user.

`source` · `entity` · Google Calendar

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = google_calendar_users.dx_user_id
  ```
