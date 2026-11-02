# Bitrise tables

1 table. Every join below is stated with the SQL to write.

## bitrise_apps

Bitrise apps (repositories/projects connected to Bitrise CI/CD).

`source` · `entity` · Bitrise

No documented relationships.

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **No documented relationships** — Nothing in the schema points at this table and it points at nothing, so there is no verified way to join it. Treat any link you infer from column names as a guess until you have checked it against the data.
